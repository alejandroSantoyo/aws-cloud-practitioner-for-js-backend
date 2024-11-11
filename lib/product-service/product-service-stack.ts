import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

const MEMORY_SIZE = 1024;
const LAMBDA_ASSETS_PATH = path.join(__dirname, './lambdas');

const PRODUCTS_TABLE_NAME = "Products";
const STOCK_TABLE_NAME = "Stock";

export class ProductServiceStack extends cdk.Stack {
    public readonly catalogItemsQueue: Queue; // Make the queue accessible

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const api = new apigateway.RestApi(this, "product-service", {
            restApiName: "Products Service API",
            description: "API backend to provide content to react application",
        });

        const getProductsLambda = new lambda.Function(this, 'get-products', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsList.main',
            code: lambda.Code.fromAsset(LAMBDA_ASSETS_PATH),
            environment: {
                PRODUCTS_TABLE_NAME,
                STOCK_TABLE_NAME
            }
        });

        const getProductsByIdLambda = new lambda.Function(this, 'get-products-by-id', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsById.main',
            code: lambda.Code.fromAsset(LAMBDA_ASSETS_PATH),
            environment: {
                PRODUCTS_TABLE_NAME,
                STOCK_TABLE_NAME
            }
        });

        // Task 4 - create product lambda

        const createProductLambda = new lambda.Function(this, 'create-product', {
            functionName: 'create-product',
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: cdk.Duration.seconds(5),
            handler: 'createProduct.main',
            code: lambda.Code.fromAsset(LAMBDA_ASSETS_PATH),
            environment: {
                PRODUCTS_TABLE_NAME,
                STOCK_TABLE_NAME,
            },
        });

        const getProductsLambdaIntegration = new apigateway.LambdaIntegration(getProductsLambda, {});

        const getProductsByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductsByIdLambda, {
            // requestTemplates: {
            //     "application/json": JSON.stringify({
            //         pathParameters: {
            //             id: "$input.params('id')",
            //         },
            //         otherStuff: "$input.params('id')"
            //     })
            // },
            // integrationResponses: [
            //     { statusCode: '200' },
            // ],
            // proxy: false
        });

        const createProductLambdaIntegration = new apigateway.LambdaIntegration(createProductLambda, {});

        // Create a resource /products and GET request under it
        const productsResource = api.root.addResource("products");
        
        // On this resource attach a GET method which pass the request to our lambda function
        productsResource.addMethod('GET', getProductsLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        // Add POST method to resource
        productsResource.addMethod('POST', createProductLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        })

        // apply CORS to our source
        productsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET', 'POST'],
        });

        const productsByIdResource = productsResource.addResource("{id}")
        productsByIdResource.addMethod('GET', getProductsByIdLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        productsByIdResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET'],
        });

        // Task #4 - DynamoDB integration
        const productsTable = new dynamodb.Table(this, PRODUCTS_TABLE_NAME, {
            tableName: PRODUCTS_TABLE_NAME,
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.STRING
            }
        });

        const stockTable = new dynamodb.Table(this, STOCK_TABLE_NAME, {
            tableName: STOCK_TABLE_NAME,
            partitionKey: {
                name: 'product_id',
                type: dynamodb.AttributeType.STRING,
            }
        });

        // Grant read access to /products lambda
        productsTable.grantReadData(getProductsLambda);
        stockTable.grantReadData(getProductsLambda);
        
        // Grant read access to /products/:id lambda
        productsTable.grantReadData(getProductsByIdLambda);
        stockTable.grantReadData(getProductsByIdLambda);

        // Grant write access to /products (POST)
        productsTable.grantWriteData(createProductLambda);
        stockTable.grantWriteData(createProductLambda);
        
        // Task #6 - SNS
        const createProductTopic = new Topic(this, "createProductTopic");

        createProductTopic.addSubscription(
            new EmailSubscription('santoyo.alejandro.93@gmail.com')
        )

        // Task #6 SQS 
        this.catalogItemsQueue = new Queue(this, "catalogItemsQueue");

        const catalogBatchLambda = new lambda.Function(this, "catalogBatchProcess", {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: cdk.Duration.seconds(5),
            handler: 'catalogBatchProcess.main',
            code: lambda.Code.fromAsset(LAMBDA_ASSETS_PATH),
            environment: {
                PRODUCTS_TABLE_NAME,
                STOCK_TABLE_NAME,
                SNS_TOPIC_ARN: createProductTopic.topicArn,
            }
        });

        catalogBatchLambda.addEventSource(new SqsEventSource(this.catalogItemsQueue, {
            batchSize: 5,
        }));

        productsTable.grantWriteData(catalogBatchLambda);
        stockTable.grantWriteData(catalogBatchLambda);

        createProductTopic.grantPublish(catalogBatchLambda);
    }

}

