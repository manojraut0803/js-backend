// [1] promises
const asyncHandler = (requestHandler) => {
  return (req, res, next) => {                  // higher order function should return here
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    // Promise.resolve(requestHandler(req, res, next)).catch(next);

  };
};

export { asyncHandler };

/*
// [2] try catch
const asyncHandler = (func) => async (req, res, next) => {
  try {
    await func(req, res, next);
  } catch (error) {
    res.status(err.code || 500).json({
      success: false,
      message: err.message,
    });
  }
};
*/
