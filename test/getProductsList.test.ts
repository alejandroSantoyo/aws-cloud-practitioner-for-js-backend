import { Context } from "aws-lambda";
import { main } from "../lib/product-service/lambdas/getProductsList";

describe("getProductsList Tests", () => {

    const context = {} as Context;

    test("getProductsList returns a list of products", async () => {
        const { body: products } = await main({}, context, () => null);
        expect(products).toBeInstanceOf(Array);
        expect(products.length).toBe(6);
    });

})