import { API_URL } from "@/config";
import { ApiClient } from "../api/client";

class UserServiceAPI {
  // Private Fields
  private client: ApiClient;
  // End Private Fields

  // CTOR
  constructor() {
    this.client = new ApiClient({
      baseURL: API_URL,
    });
  }
  // End CTOR

  // Private Methods
  async getAllUsers(): Promise<string> {
    return "Hello World";
  }
  // End Private Methods

  // Public Methods

  // End Public Methods
}


export const userServiceAPI = new UserServiceAPI()