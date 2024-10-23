import { mockedProducts } from '../data/mockedProducts';

const PRODUCT_ENDPOINT = "https://7nx2dihqaf.execute-api.us-east-1.amazonaws.com/prod/products";

const sendRequest = async () => {
    try {
        const response = await fetch(PRODUCT_ENDPOINT, {
            method: 'POST',
            body: JSON.stringify(mockedProducts),
        });

        if (response.status !== 200) throw new Error(await response.text())

        const data = await response.json();
        console.log("Endpoint Response:", JSON.stringify(data, null, 4));
    } catch (error) {
        console.error("Error:", error);
    }
}

sendRequest();