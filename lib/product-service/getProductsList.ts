import { mockedProducts } from "./data/mockedProducts";


export const main = async(event: any) => {
    return {
        statusCode: 200,
        body: JSON.stringify(mockedProducts),
        headers: {
            'Content-Type': 'application/json',
            "Access-Control-Allow-Origin": "*", // Required for CORS support to work
        }
    };
};
