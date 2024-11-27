#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductServiceStack } from '../lib/product-service/product-service-stack';
import { ImportServiceStack } from '../lib/ImportServiceStack/import-service-stack';
import { AuthorizationServiceStack } from '../lib/authorization-service/authorization-service-stack';
import { ApiWithCustomAuthorizerStack } from '../lib/TestStack/ApiWithCustomAuthorizerStack';
import { CartServiceStack } from '../lib/cart-service/cart-service-stack';

const app = new cdk.App();
// new AwsCloudPractitionerForJsBackendStack(app, 'AwsCloudPractitionerForJsBackendStack', {
//   /* If you don't specify 'env', this stack will be environment-agnostic.
//    * Account/Region-dependent features and context lookups will not work,
//    * but a single synthesized template can be deployed anywhere. */

//   /* Uncomment the next line to specialize this stack for the AWS Account
//    * and Region that are implied by the current CLI configuration. */
//   // env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

//   /* Uncomment the next line if you know exactly what Account and Region you
//    * want to deploy the stack to. */
//   // env: { account: '123456789012', region: 'us-east-1' },

//   /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
// });

// new HelloLambdaStack(app, 'HelloLambdaStack', {});
const productServiceStack = new ProductServiceStack(app, 'ProductServiceStack', {});
// new HelloS3Stack(app, 'HelloS3Stack', {});
new ImportServiceStack(app, 'ImportServiceStack', { productServiceStack });
// new ProductSqsStack(app, "ProductSqsStack");
// new ProductSnsStack(app, "ProductSnsStack");
// new AuthorizerStack(app, 'AuthorizerStack');
new AuthorizationServiceStack(app, 'AuthorizationServiceStack', {});
new CartServiceStack(app, 'CartServiceStack');

// new ApiWithCustomAuthorizerStack(app, 'ApiWithCustomAuthorizerStack');