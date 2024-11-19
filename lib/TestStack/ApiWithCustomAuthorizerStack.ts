import * as cdk from 'aws-cdk-lib';
import {
  AuthorizationType,
  IdentitySource,
  LambdaIntegration,
  RestApi,
  TokenAuthorizer,
} from 'aws-cdk-lib/aws-apigateway';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

export class ApiWithCustomAuthorizerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda Authorizer
    const authorizerLambda = new Function(this, 'AuthorizerLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'authorizer.main',
      code: Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: {
        CREDENTIALS: 'user:password', // Replace with your credentials
      },
    });

    // Authorizer
    const authorizer = new TokenAuthorizer(this, 'CustomAuthorizer', {
      handler: authorizerLambda,
      identitySource: IdentitySource.header('Authorization'),
    });

    // Lambda to return mocked users
    const usersLambda = new Function(this, 'UsersLambda', {
      runtime: Runtime.NODEJS_20_X,
      handler: 'users.main',
      code: Code.fromAsset(path.join(__dirname, 'lambdas')),
    });

    // API Gateway
    const api = new RestApi(this, 'MockedUsersApi', {
      restApiName: 'Mocked Users API',
      description: 'API for retrieving a mocked list of users',
    });

    // Users resource and GET method
    const usersResource = api.root.addResource('users');
    usersResource.addMethod('GET', new LambdaIntegration(usersLambda), {
      authorizer: authorizer,
      authorizationType: AuthorizationType.CUSTOM,
    });
  }
}
