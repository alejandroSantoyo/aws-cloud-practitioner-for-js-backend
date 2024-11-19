import { APIGatewayProxyHandler } from 'aws-lambda';

export const main: APIGatewayProxyHandler = async () => {
  const users = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Alice Johnson' },
  ];

  return {
    statusCode: 200,
    body: JSON.stringify(users),
  };
};
