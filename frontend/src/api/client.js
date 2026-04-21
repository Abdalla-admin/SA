import axios from 'axios';

const client = axios.create({ baseURL: '/api', timeout: 15000 });

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sa_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

client.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sa_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;
