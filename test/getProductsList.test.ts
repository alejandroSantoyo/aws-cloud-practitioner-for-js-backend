import { main } from "../lib/product-service/getProductsList";

describe("getProductsList Tests", () => {

    test("getProductsList returns a list of products", async () => {
        const { products } = await main({});
        expect(products).toBeInstanceOf(Array);
        expect(products.length).toBe(6);
    });

})