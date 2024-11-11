import { BatchWriteItemCommand, DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { SQSEvent } from "aws-lambda";
import { v4 as uuidv4 } from 'uuid';

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN as string;

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const snsClient = new SNSClient();

export const main = async (event: SQSEvent) => {
    console.log("Received SQS Event:", JSON.stringify(event, null, 4));

    const products: ProductResponse[] = event.Records.map(record => {
        const { count = 1, price, title, description }: ProductRequest = JSON.parse(record.body);
        return {
            id: uuidv4(),
            count,
            price,
            title,
            description
        }
    });

    const batchProductsCommand = new BatchWriteItemCommand({
        RequestItems: {
            [PRODUCTS_TABLE_NAME]: products.map(product => ({
                PutRequest: {
                    Item: {
                        id: { S: product.id },
                        title: { S: product.title },
                        description: { S: product.description || "" },
                        price: { N: (+product.price).toFixed(2) },
                        createdAt: { N: new Date().getTime().toFixed() }
                    }
                }
            }))
        }
    });

    const batchStockCommand = new BatchWriteItemCommand({
        RequestItems: {
            [STOCK_TABLE_NAME]: products.map(product => ({
                PutRequest: {
                    Item: {
                        product_id: { S: product.id },
                        count: { N: (+product.count).toString() },
                        createdAt: { N: new Date().getTime().toFixed() }
                    }
                }
            }))
        }
    });

    try {
        Promise.all([
            await dynamoDB.send(batchProductsCommand),
            await dynamoDB.send(batchStockCommand),
        ]);
        
        console.log(`Total Products added: ${event.Records.length}`);
    
        const publishCommand = new PublishCommand({
            Subject: "New Products Added!",
            Message: `${event.Records.length} new Products were created succesfully!`,
            TopicArn: SNS_TOPIC_ARN
        });
    
        await snsClient.send(publishCommand);
        console.log("Email sent to SNS topic");
    } catch (error) {
        console.error("Error processing batch or sending SNS notification:", error);
    }

}