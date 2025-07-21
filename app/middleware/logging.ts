import type { unstable_MiddlewareFunction } from "react-router";

export const loggingMiddleware: unstable_MiddlewareFunction = async (
  { request },
  next,
) => {
  console.log(`Request started: ${request.method} ${request.url}`);

  const start = performance.now();
  try {
    const response = await next();

    const duration = performance.now() - start;

    const statusCode =
      response instanceof Response ? response.status : undefined;

    console.log(
      `Request completed: ${request.method} ${request.url} ${statusCode} - ${duration.toFixed(3)} ms`,
    );

    return response;
  } catch (error) {
    if (error instanceof Response) {
      const duration = performance.now() - start;
      console.log(
        `Request completed: ${request.method} ${request.url} ${error.status} - ${duration.toFixed(3)} ms`,
      );
    } else {
      console.error(
        `Request failed: ${request.method} ${request.url} - ${error}`,
      );
    }
    throw error;
  }
};
