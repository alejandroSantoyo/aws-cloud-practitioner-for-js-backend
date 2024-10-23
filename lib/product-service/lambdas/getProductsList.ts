import { Handler } from 'aws-lambda';
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });
const db = DynamoDBDocument.from(dynamoDB);

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event) => {
    try {
        console.log("::getProductsList:: event:", JSON.stringify(event, null, 4));

        const [products, stock] = await Promise.all([
            db.scan({ TableName: PRODUCTS_TABLE_NAME }),
            db.scan({ TableName: STOCK_TABLE_NAME })
        ]);

        const response: ProductResponse[] = (products.Items as DBProduct[])?.map(product => {
            const count = (stock.Items as Stock[]).find(item => item.product_id === product.id)?.count || 0;
            return {
                ...product,
                count
            };
        });

        console.log("::getProductsList:: products:", products.Items);
        console.log("::getProductsList:: stoctk:", stock.Items);
        console.log("::getProductsList:: response:", response);

        return {
            statusCode: 200,
            body: JSON.stringify(response),
            headers: {
                'Content-Type': 'application/json',
                "Access-Control-Allow-Origin": "*", // Required for CORS support to work
            }
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify(error)
        }
    }
};
