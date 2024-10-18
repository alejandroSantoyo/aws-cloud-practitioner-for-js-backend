import { mockedProducts } from "./data/mockedProducts";

export const main = async(event: any) => {
    const id = event.pathParameters.id;

    const product = mockedProducts.find(product => product.id === id);
    return {
        product,
        error: !product && "Product not found"
    };
};