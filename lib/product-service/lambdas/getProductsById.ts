import { Handler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';


const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocument.from(dynamoDB);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event) => {
    console.log("::getProductsById:: event:", JSON.stringify(event, null, 4));
    
    const id: string = event.pathParameters.id;

    if (!id) {
        return { statusCode: 400, body: `Error: You are missing the path parameter id` };
    }

    try {
        console.log('before product:', PRODUCTS_TABLE_NAME, id)
        const product = await db.get({
            TableName: PRODUCTS_TABLE_NAME,
            Key: {
                id
            }
        });

        const stock = await db.get({
            TableName: STOCK_TABLE_NAME,
            Key: {
                product_id: id
            }
        });

        console.log("::getProductsById:: product response:", product);

        return {
            statusCode: 200,
            body: JSON.stringify({
                ...product.Item,
                count: stock?.Item?.count,
            })
        }
    } catch (error) {
        console.error(error);
        return { statusCode: 500, body: JSON.stringify(error) };
    }
};