import { mockedProducts } from "./data/mockedProducts";


export const main = async(event: any) => {
    return {
        products: mockedProducts,
    }
};
