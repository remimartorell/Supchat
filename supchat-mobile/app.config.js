import 'dotenv/config';

export default {
  expo: {
    name: 'Supchat',
    slug: 'supchat',
    version: '1.0.0',
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
    },
  },
};
