import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { APIGatewayProxyEvent, Handler } from "aws-lambda";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";


export const main: Handler = async (event: APIGatewayProxyEvent) => {
    console.log("::importProductsFile:: event:", JSON.stringify(event, null, 4));
    
    const fileName = event.queryStringParameters?.fileName;

    if (!fileName) {
        return {
            statusCode: 400,
            body: 'Invalid request, you are missing "fileName" the parameter',
        }
    } else if (!fileName.endsWith("csv")) {
        return {
            statusCode: 400,
            body: 'Invalid request, only .csv files are accepted',
        }
    }

    try {
        const BUCKET_NAME = process.env.BUCKET_NAME as string;
        const s3 = new S3Client({ region: process.env.AWS_REGION });

        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: `uploaded/${fileName}`,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 3600 });

        return {
            statusCode: 200,
            body: JSON.stringify({ url }),
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET,PUT',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }

    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error })
        }
    }
}