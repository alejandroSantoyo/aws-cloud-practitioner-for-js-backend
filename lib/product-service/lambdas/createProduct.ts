import { Handler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb'
import { v4 as uuidv4 } from 'uuid';

const dynamoDB = new DynamoDBClient({ region: process.env.AWS_REGION });

const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME as string;
const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME as string;

export const main: Handler = async (event) => {
    console.log("::createProduct:: event:", JSON.stringify(event, null, 4));

    if (!event.body) {
        return {
            statusCode: 400,
            body: 'Invalid request, you are missing the parameter body',
        }
    }

    const payload = JSON.parse(event.body);

    // Batch Insert:
    if (Array.isArray(payload)) {
        if (payload.length === 0) return {
            statusCode: 200,
            body: JSON.stringify({
                batchInserted: false,
                error: "No items provided"
            })
        }

        try {
            const products: ProductResponse[] = (payload as ProductRequest[])
                .map(product => ({
                    ...product,
                    id: uuidv4(),
                    count: product.count ?? 1,
                }));

            const batchProductsCommand = new BatchWriteItemCommand({
                RequestItems: {
                    [PRODUCTS_TABLE_NAME]: products.map(product => ({
                        PutRequest: {
                            Item: {
                                id: { S: product.id },
                                title: { S: product.title },
                                description: { S: product.description || "" },
                                price: { N: product.price.toFixed() },
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
                                count: { N: product.count.toFixed() },
                                createdAt: { N: new Date().getTime().toFixed() }
                            }
                        }
                    }))
                }
            });

            Promise.all([
                await dynamoDB.send(batchProductsCommand),
                await dynamoDB.send(batchStockCommand),
            ]);

            return {
                statusCode: 200,
                body: JSON.stringify({
                    batchInserted: true
                })
            }
        } catch (error) {
            console.error("ERROR inserting batch:", error)
            return {
                statusCode: 500,
                body: JSON.stringify({
                    batchInserted: false,
                    error
                })
            }
        }

    }

    const { title, description, price, count = 1 } = JSON.parse(event.body) as ProductRequest || {};

    if (!title || !price) {
        return {
            statusCode: 400,
            body: 'Invalid request, missing title or price'
        }
    }

    try {
        const productId = uuidv4();
        const createdAt = new Date().getTime().toFixed();
        const productCommand = new PutItemCommand({
            TableName: PRODUCTS_TABLE_NAME,
            Item: {
                id: { S: productId },
                title: { S: title },
                description: { S: description || "" },
                price: { N: price.toFixed() },
                createdAt: { N: createdAt }
            }
        });

        const stockCommand = new PutItemCommand({
            TableName: STOCK_TABLE_NAME,
            Item: {
                product_id: { S: productId },
                count: { N: count.toFixed() },
                createdAt: { N: createdAt }
            }
        });

        Promise.all([
            await dynamoDB.send(productCommand),
            await dynamoDB.send(stockCommand),
        ]);

        return {
            statusCode: 200,
            body: JSON.stringify({
                id: productId,
                title,
                description,
                price,
                count: +count,
                createdAt: +createdAt
            }),
        }
    } catch (error) {
        console.error("Error creating product", error);
        return {
            statusCode: 500,
            body: JSON.stringify(error)
        }
    }
}