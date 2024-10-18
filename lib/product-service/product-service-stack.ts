import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import { Construct } from 'constructs';

const MEMORY_SIZE = 1024;
const ASSETS_PATH = path.join(__dirname, './');

export class ProductServiceStack extends cdk.Stack {
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
            code: lambda.Code.fromAsset(ASSETS_PATH)
        });

        const getProductsByIdLambda = new lambda.Function(this, 'get-products-by-id', {
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: MEMORY_SIZE,
            timeout: cdk.Duration.seconds(5),
            handler: 'getProductsById.main',
            code: lambda.Code.fromAsset(ASSETS_PATH)
        });

        const getProductsLambdaIntegration = new apigateway.LambdaIntegration(getProductsLambda, {
            integrationResponses: [
                { statusCode: '200' },
            ],
            proxy: false
        });

        const getProductsByIdLambdaIntegration = new apigateway.LambdaIntegration(getProductsByIdLambda, {
            requestTemplates: {
                "application/json": JSON.stringify({
                    pathParameters: {
                        id: "$input.params('id')",
                    },
                    otherStuff: "$input.params('id')"
                })
            },
            integrationResponses: [
                { statusCode: '200' },
            ],
            proxy: false
        });

        // Create a resource /products and GET request under it
        const productsResource = api.root.addResource("products");
        // On this resource attach a GET method which pass the request to our lambda function
        productsResource.addMethod('GET', getProductsLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        // apply CORS to our source
        productsResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET'],
        });

        const productsByIdResource = productsResource.addResource("{id}")
        productsByIdResource.addMethod('GET', getProductsByIdLambdaIntegration, {
            methodResponses: [{ statusCode: '200' }],
        });

        productsByIdResource.addCorsPreflight({
            allowOrigins: ['*'],
            allowMethods: ['GET'],
        });
    }

}

