import apiClient from './apiClient';

const SALES_BASE_PATH = '/api/sales';

const salesApi = {
  getSales: async () => {
    const response = await apiClient.get(SALES_BASE_PATH);
    return response.data;
  },

  sell: async (command) => {
    const response = await apiClient.post(`${SALES_BASE_PATH}/sell`, command);
    return response.data;
  },

  pay: async (command) => {
    const response = await apiClient.post(`${SALES_BASE_PATH}/pay`, command);
    return response.data;
  },

  cancel: async (command) => {
    const response = await apiClient.post(`${SALES_BASE_PATH}/cancel`, command);
    return response.data;
  },
};

export default salesApi;
