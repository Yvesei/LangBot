export async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (!response) {
        throw new Error('No response received from server');
      }

      // Only retry on 429 (rate limit)
      if (response.status === 429 && attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Rate limited. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For any other response (success or error), return it
      return response;

    } catch (error) {
      // Only network errors (fetch threw an exception) end up here
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000);
        console.log(`Request failed. Retrying in ${waitTime}ms... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError ? lastError.message : 'Unknown error'}`);
}