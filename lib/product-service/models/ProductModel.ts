interface DBProduct {
    id: string;
    title: string;
    description?: string;
    price: number;
}

interface ProductResponse extends DBProduct {
    count: number;
}

type ProductRequest = Omit<ProductResponse, 'id'>;