import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import axios, { AxiosResponse } from 'axios';
import { getEnv } from '../loadEnv';

interface ValidationResponse {
  data: {
    authorized: boolean;
  };
  error: {
    message: string;
    statusCode: number;
  };
}

export const apiKeyValidator = async (request: FastifyRequest, reply: FastifyReply): Promise<boolean> => {
    const key = request.headers['x-api-key'] as string;
    try {
      const response: AxiosResponse<ValidationResponse> = await axios.post(
        `${getEnv('THIRDWEB_API_ORIGIN')}/v1/keys/use`,
        {
          body: JSON.stringify({
            scope: 'web3-api', // We will need to change the scope dynamically based on the request
          }),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
          },
          validateStatus: function (status) {
            return status < 500; // Resolve only if the status code is less than 500
          },
        }
      );
      if (response.data.error) {
        reply
          .status(response.data.error.statusCode)
          .send({ message: response.data.error.message });
        return false;
      }
    return true;
    } catch (error: any) {
      console.error(`Error while validating API key: ${error.message}`);
      console.error(
        'The API verification server may be down. The client will be permitted to continue.'
      );

      reply
          .status(error.statusCode)
          .send({ message: error.message });
      return false;
    }
};

export default apiKeyValidator;