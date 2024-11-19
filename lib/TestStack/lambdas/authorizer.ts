import {
    APIGatewayAuthorizerResult,
    APIGatewayTokenAuthorizerEvent,
  } from 'aws-lambda';
  
  const CREDENTIALS = process.env.CREDENTIALS as string;
  
  export const main = async (
    event: APIGatewayTokenAuthorizerEvent
  ): Promise<APIGatewayAuthorizerResult> => {
    console.log('Authorization event:', JSON.stringify(event, null, 2));
  
    try {
      const token = event.authorizationToken;
      if (!token) throw new Error('Missing Authorization Token');
  
      const [type, encoded] = token.split(' ');
      if (type !== 'Basic' || !encoded)
        throw new Error('Invalid Authorization Header');
  
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      if (decoded !== CREDENTIALS) throw new Error('Invalid Credentials');
  
      return generatePolicy('user', 'Allow', event.methodArn);
    } catch (error: any) {
      console.error('Authorization Error:', error.message);
      return generatePolicy('user', 'Deny', event.methodArn);
    }
  };
  
  const generatePolicy = (
    principalId: string,
    effect: 'Allow' | 'Deny',
    resource: string
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
  });
  