import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as dotenv from "dotenv";

import * as path from 'path';

dotenv.config();

export class AuthorizationServiceStack extends Stack {

    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const username = process.env.username?.trim();
        const password = process.env.password?.trim();
    

        const basicAuthorizerLambda = new Function(this, "basicAuthorization", {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: Duration.seconds(15),
            handler: 'basicAuthorizer.main',
            code: Code.fromAsset(path.join(__dirname, "./lambdas")),
            environment: {
                CREDENTIALS: `${username}:${password}`,
            }
        });

        new CfnOutput(this, 'BasicAuthorizerArnOutput', {
            value: basicAuthorizerLambda.functionArn,
            exportName: 'BasicAuthorizerArn',
        });

    }
}
