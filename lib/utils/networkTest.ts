/**
 * Network bandwidth estimation utility
 * Tests download speed before connecting to adjust initial quality settings
 */

export type NetworkSpeed = 'fast' | 'medium' | 'slow';

export interface NetworkTestResult {
  speed: NetworkSpeed;
  estimatedBandwidth: number; // in bits per second
  latency: number; // in milliseconds
}

/**
 * Estimate network speed using a simple bandwidth test
 * Downloads a small file and measures the time taken
 */
export async function estimateNetworkSpeed(): Promise<NetworkTestResult> {
  const startTime = Date.now();
  let estimatedBandwidth = 0;
  let latency = 0;

  try {
    // Use a small API endpoint or a known small resource for testing
    // This is a lightweight test - just ping the server
    // Try health endpoint first, fallback to connection-details if not available
    let testUrl = '/api/health';
    try {
      // Check if health endpoint exists by trying it
      const healthCheck = await fetch(testUrl, { method: 'HEAD', cache: 'no-store' });
      if (!healthCheck.ok) {
        testUrl = '/api/connection-details'; // Fallback endpoint
      }
    } catch {
      testUrl = '/api/connection-details'; // Fallback endpoint
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const response = await fetch(testUrl, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const endTime = Date.now();
      latency = endTime - startTime;

      // Estimate bandwidth based on response time
      // This is a rough estimate - actual bandwidth would require downloading a known-size file
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          const bytes = parseInt(contentLength, 10);
          const duration = (endTime - startTime) / 1000; // in seconds
          estimatedBandwidth = (bytes * 8) / duration; // bits per second
        } else {
          // If no content-length, estimate based on latency
          // Lower latency generally indicates better connection
          estimatedBandwidth = latency < 100 ? 2000000 : latency < 300 ? 1000000 : 500000;
        }
      } else {
        // Fallback estimation based on latency
        estimatedBandwidth = latency < 100 ? 2000000 : latency < 300 ? 1000000 : 500000;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const endTime = Date.now();
      latency = endTime - startTime;
      
      // If fetch fails, assume slow connection
      estimatedBandwidth = 300000; // 300 kbps
    }

    // Categorize network speed
    let speed: NetworkSpeed;
    if (estimatedBandwidth >= 2000000 && latency < 100) {
      speed = 'fast';
    } else if (estimatedBandwidth >= 1000000 && latency < 300) {
      speed = 'medium';
    } else {
      speed = 'slow';
    }

    return {
      speed,
      estimatedBandwidth,
      latency,
    };
  } catch (error) {
    // If test fails completely, assume slow connection
    return {
      speed: 'slow',
      estimatedBandwidth: 300000,
      latency: 500,
    };
  }
}

/**
 * Get adaptive timeout based on network speed
 */
export function getAdaptiveTimeout(networkSpeed: NetworkSpeed): number {
  switch (networkSpeed) {
    case 'fast':
      return 20000; // 20 seconds
    case 'medium':
      return 30000; // 30 seconds
    case 'slow':
      return 60000; // 60 seconds
    default:
      return 30000; // Default 30 seconds
  }
}

