import { Context } from "aws-lambda";
import { main } from "../lib/product-service/lambdas/getProductsById";

describe("getProductsById Tests", () => {

    test('getProductsById returns a product when receives a valid ID', async () => {
        const product = await main({
            pathParameters: { id: "7567ec4b-b10c-48c5-9345-fc73c48a80aa" }
        }, {} as Context, () => null);
        expect(product).toBeDefined();
    });

    test('getProductsById returns an error when receives a invalid ID', async () => {
        const response = await main({
            pathParameters: { id: "invalid-id" }
        }, {} as Context, () => null);
        expect(response.error).toBe("Product not found")
    });
});