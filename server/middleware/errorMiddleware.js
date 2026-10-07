export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong';

  res.status(statusCode).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : message,
  });
};
