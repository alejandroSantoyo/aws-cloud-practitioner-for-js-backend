import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { InstanceClass, InstanceSize, InstanceType, SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Credentials, DatabaseInstance, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

import * as dotenv from "dotenv";
dotenv.config();

export class CartServiceStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        if (!process.env.dbName || !process.env.dbUsername) {
            throw new Error('Missing .env file or variables');
        }

        const DB_USERNAME = process.env.dbUsername.trim();
        const DB_NAME = process.env.dbName.trim();

        // const dbSecret = new Secret(this, 'DBSecret', {
        //     secretName: 'MyDatabaseSecret',
        //     generateSecretString: {
        //         secretStringTemplate: JSON.stringify({ username: DB_USERNAME }),
        //         generateStringKey: 'password',
        //         excludePunctuation: true,
        //     },
        // });

        const dbCredentialsSecret = new Secret(this, 'MyDBCreds', {
            secretName: 'MyDBCredsName',
            generateSecretString: {
                secretStringTemplate: JSON.stringify({ username: DB_USERNAME }),
                generateStringKey: 'password',
                excludePunctuation: true,
            },
        });

        const vpc = new Vpc(this, 'MyVPC', {
            maxAzs: 2, // Default is all AZs in the region
            subnetConfiguration: [
                {
                    cidrMask: 24,
                    name: 'PublicSubnet',
                    subnetType: SubnetType.PUBLIC,
                },
                // Private subnet
                // {
                //     cidrMask: 24,
                //     name: 'PrivateSubnet',
                //     subnetType: SubnetType.PRIVATE_WITH_EGRESS,
                // },
            ],
        });

        const dbInstance = new DatabaseInstance(this, 'RDSInstancePostgresDB', {
            // PostgresDB
            engine: DatabaseInstanceEngine.POSTGRES,
            instanceType: InstanceType.of(InstanceClass.BURSTABLE3, InstanceSize.MICRO),
            vpc,
            credentials: Credentials.fromGeneratedSecret(DB_USERNAME),
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC
            },
            // vpcSubnets: {
            //     subnetType: SubnetType.PRIVATE_WITH_EGRESS,
            // },
            multiAz: false,
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            databaseName: DB_NAME,
            allowMajorVersionUpgrade: false,
            autoMinorVersionUpgrade: true,
            backupRetention: Duration.days(7),
            deleteAutomatedBackups: true,
            removalPolicy: RemovalPolicy.DESTROY,
            deletionProtection: false
        });

        // Lambda function for Nest JS API
        const nestJsLambda = new Function(this, 'CartNestAPI', {
            runtime: Runtime.NODEJS_20_X,
            handler: 'main.handler',
            memorySize: 1024,
            code: Code.fromAsset('../lambda-deployment.zip'),
            vpc, // Associate the Lambda function with the VPC
            allowPublicSubnet: true, // Confirm that lambda is in VPC
            securityGroups: [dbInstance.connections.securityGroups[0]],
            environment: {
                NODE_ENV: 'production',
                // DB connections
                DB_HOST: dbInstance.dbInstanceEndpointAddress,
                DB_PORT: dbInstance.dbInstanceEndpointPort,
                DB_USER: dbCredentialsSecret.secretValueFromJson('username').unsafeUnwrap(),
                DB_PASSWORD: dbCredentialsSecret.secretValueFromJson('password').unsafeUnwrap(),
                DB_NAME,
            },
        });

        dbInstance.connections.allowDefaultPortFrom(nestJsLambda);
        dbCredentialsSecret.grantRead(nestJsLambda);

        // Create API Gateway and integrate with Lambda
        const api = new LambdaRestApi(this, 'ApiGatewayNestAPI', {
            handler: nestJsLambda,
            restApiName: 'Nest Cart Service',
            description: 'This service serves a Nest.js application.',
        });

        new CfnOutput(this, 'ApiUrl', {
            value: api.url ?? 'Something went wrong with the deployment',
        });
    };
}