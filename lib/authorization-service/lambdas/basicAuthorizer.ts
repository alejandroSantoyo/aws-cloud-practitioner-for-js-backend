import {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
} from 'aws-lambda';

const CREDENTIALS = process.env.CREDENTIALS as string;

export const main = async (
    event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
    console.log('Authorization event:', JSON.stringify(event, null, 4));

    try {
        const token = event.authorizationToken;
        if (!token) {
            return generatePolicy('user', 'Deny', event.methodArn, 401);
        }

        const [type, encoded] = token.split(' ');
        if (type !== 'Basic' || !encoded)
            throw new Error('Invalid Authorization Header');

        const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
        if (decoded !== CREDENTIALS) throw new Error('Invalid Credentials');

        return generatePolicy('user', 'Allow', event.methodArn, 200);
    } catch (error: any) {
        return generatePolicy('user', 'Deny', event.methodArn, 403);
    }
};

const generatePolicy = (
    principalId: string,
    effect: 'Allow' | 'Deny',
    resource: string,
    statusCode: number = 200,
): APIGatewayAuthorizerResult => ({
    principalId,
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: effect,
                Resource: resource,
            },
        ],
    },
    context: {
        statusCode: statusCode.toString(),
    }
});
