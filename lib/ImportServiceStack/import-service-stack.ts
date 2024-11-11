import { Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, EventType, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { LambdaDestination } from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import path = require('path');
import { ProductServiceStack } from '../product-service/product-service-stack';

const MEMORY_SIZE = 1024;
const TIMEOUT = Duration.seconds(5);

interface ImportServiceStackProps extends StackProps {
    productServiceStack: ProductServiceStack;
}

export class ImportServiceStack extends Stack {
    constructor(scope: Construct, id: string, props?: ImportServiceStackProps) {
        super(scope, id, props);

        const bucket = new Bucket(this, 'ImportServiceBucket', {
            versioned: true,
            removalPolicy: RemovalPolicy.DESTROY,
            cors: [
                {
                    allowedHeaders: ["*"],
                    allowedOrigins: ["*"],
                    allowedMethods: [HttpMethods.PUT, HttpMethods.GET, HttpMethods.DELETE, HttpMethods.POST, HttpMethods.HEAD]
                }
            ]
        });

        const catalogItemsQueue = props?.productServiceStack.catalogItemsQueue;

        const importProductsFileLambda = new Function(this, 'importProductsFile', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: 1024,
            timeout: TIMEOUT,
            handler: 'importProductsFile.main',
            code: Code.fromAsset(path.join(__dirname, './lambdas')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
            },
        });

        const importFileParserLambda = new Function(this, 'importFileParser', {
            runtime: Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: TIMEOUT,
            handler: 'importFileParser.main',
            code: Code.fromAsset(path.join(__dirname, './lambdas')),
            environment: {
                BUCKET_NAME: bucket.bucketName,
                SQS_URL: catalogItemsQueue?.queueUrl || ""
            },
        });

        // Grant the Lambda function read/write permissions to the S3 bucket
        const s3Policy = new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["s3:GetObject"],
            resources: [`${bucket.bucketArn}/uploaded/*`],
        });

        bucket.grantPut(importProductsFileLambda);

        importProductsFileLambda.addToRolePolicy(s3Policy);

        // API Gateway REST API
        const api = new RestApi(this, "import-service-api", {
            restApiName: "Import Service API",
            description: "API for imports lambda functions",
        });

        const importProductsFileLambdaIntegration = new LambdaIntegration(importProductsFileLambda, {});

        const importProductsFileResource = api.root.addResource("import");

        importProductsFileResource.addMethod('GET', importProductsFileLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        importProductsFileResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET'],
        });

        // Bucket event notification

        importFileParserLambda.addToRolePolicy(
            new PolicyStatement({
                actions: ['s3:GetBucketNotification', 's3:PutBucketNotification'],
                effect: Effect.ALLOW,
                resources: [bucket.bucketArn],
            })
        );

        bucket.addEventNotification(
            EventType.OBJECT_CREATED,
            new LambdaDestination(importFileParserLambda),
            {
                prefix: "uploaded/"
            }
        );

        bucket.grantReadWrite(importFileParserLambda);
        // check if this is neccesary
        bucket.grantPut(importFileParserLambda);

        // Task 6 - Grant Sent Messages to importFileParserLambda
        catalogItemsQueue?.grantSendMessages(importFileParserLambda);
    }
}