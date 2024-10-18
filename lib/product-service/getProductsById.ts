import { mockedProducts } from "./data/mockedProducts";

export const main = async(event: any) => {
    const id = event.pathParameters.id;
    return {
        product: mockedProducts.find(product => product.id === id),
    };
};