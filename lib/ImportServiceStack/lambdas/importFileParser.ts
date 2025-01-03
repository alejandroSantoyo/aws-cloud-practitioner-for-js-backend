import { Handler, S3Event } from 'aws-lambda';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
    waitUntilObjectNotExists,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SendMessageCommandOutput, SQSClient } from "@aws-sdk/client-sqs";
import { Readable } from 'stream';
import * as csvParser from 'csv-parser';

const sqsClient = new SQSClient();
const SQS_URL = process.env.SQS_URL as string;

export const main: Handler = async (event: S3Event) => {
    console.log("::importFileParser:: event:", JSON.stringify(event));

    const s3 = new S3Client({ region: process.env.AWS_REGION });
    const bucket = event.Records[0].s3.bucket.name;
    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));



    try {
        const { Body } = await s3.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );

        const bodyStream = Body as Readable;
        const products: ProductRequest[] = [];

        return new Promise((resolve, reject) => {
            bodyStream
                .pipe(csvParser())
                .on('data', async (data) => {
                    const product = data as ProductRequest;

                    // Task 6 - Send product to SQS
                    const response = await sendMessage(data);
                    console.log("SQS message response:", response);

                    products.push(product);
                })
                .on('end', async () => {
                    try {
                        const jsonString = JSON.stringify(products);
                        console.log("Finished processing CSV file")
                        console.log("Products:", jsonString);

                        const parsedKey = key.replace('.csv', '.json').replace('uploaded/', 'parsed/');

                        // Write parsed file
                        const putCommand = new PutObjectCommand({
                            Bucket: bucket,
                            Key: parsedKey,
                            Body: jsonString,
                            ContentType: 'application/json'
                        });

                        await s3.send(putCommand);
                        console.log("JSON file created");

                        // Delete CSV file
                        const deleteCommand = new DeleteObjectCommand({
                            Bucket: bucket,
                            Key: key,
                        });

                        await s3.send(deleteCommand);
                        await waitUntilObjectNotExists(
                            { client: s3, maxWaitTime: 6 },
                            { Bucket: bucket, Key: key },
                        );

                        console.log(`The object "${key}" from bucket "${bucket}" was deleted, or it didn't exist.`);

                        resolve(`JSON file created at ${parsedKey}`)
                    } catch (error) {
                        console.error(error);
                        reject(`Error processing CSV: ${error}`);
                    }
                })
                .on('error', error => {
                    console.error("Error:", error)
                });
        })


    } catch (err) {
        const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
        console.error(message);
        console.error(err);
        throw new Error(message);
    }
};

const sendMessage = async (product: Omit<DBProduct, "id">): Promise<SendMessageCommandOutput | unknown> => {
    const command = new SendMessageCommand({
        QueueUrl: SQS_URL,
        DelaySeconds: 10,
        MessageBody: JSON.stringify(product),
    });

    try {
        const response = await sqsClient.send(command);
        return response;
    } catch (error) {
        return error;
    }
}