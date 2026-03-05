/**
 * Supabase Wrapper for Preview Mode
 * 
 * Wraps Supabase client to return mock data in preview mode
 */

import { supabase } from "../../lib/supabase";
import { isPreviewMode, getMockData } from "./previewMode";

/**
 * Mock Supabase query builder for preview mode
 */
class MockQueryBuilder {
  private tableName: string;
  private filters: Record<string, any> = {};
  private selectFields: string = '*';

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(column: string, value: any) {
    this.filters[column] = value;
    return this;
  }

  neq(column: string, value: any) {
    this.filters[`${column}_neq`] = value;
    return this;
  }

  maybeSingle() {
    return this.executeMockQuery(true);
  }

  single() {
    return this.executeMockQuery(true);
  }

  async executeMockQuery(single = false) {
    console.log(`🎨 Preview Mode: Mock query on ${this.tableName}`, this.filters);
    
    let data = getMockData(this.tableName);
    
    // Apply filters
    Object.keys(this.filters).forEach(key => {
      const value = this.filters[key];
      if (key.endsWith('_neq')) {
        const column = key.replace('_neq', '');
        data = data.filter((item: any) => item[column] !== value);
      } else {
        data = data.filter((item: any) => item[key] === value);
      }
    });

    if (single) {
      return {
        data: data.length > 0 ? data[0] : null,
        error: null
      };
    }

    return {
      data,
      error: null
    };
  }

  // For update operations
  update(values: any) {
    console.log(`🎨 Preview Mode: Mock update on ${this.tableName}`, values);
    return {
      eq: (column: string, value: any) => {
        return {
          select: () => {
            return Promise.resolve({ data: getMockData(this.tableName)[0], error: null });
          }
        };
      }
    };
  }

  // For insert operations
  insert(values: any) {
    console.log(`🎨 Preview Mode: Mock insert on ${this.tableName}`, values);
    return {
      select: () => {
        return Promise.resolve({ 
          data: Array.isArray(values) ? values : [values], 
          error: null 
        });
      }
    };
  }

  // For delete operations
  delete() {
    console.log(`🎨 Preview Mode: Mock delete on ${this.tableName}`);
    return {
      eq: (column: string, value: any) => {
        return Promise.resolve({ data: null, error: null });
      }
    };
  }

  // For order operations
  order(column: string, options?: any) {
    return this;
  }

  // For limit operations
  limit(count: number) {
    return this;
  }

  // For range operations
  range(from: number, to: number) {
    return this;
  }

  // Execute the query (for non-chaining calls)
  then(resolve: any, reject?: any) {
    return this.executeMockQuery().then(resolve, reject);
  }
}

/**
 * Mock Supabase client for preview mode
 */
const mockSupabaseClient = {
  from: (tableName: string) => {
    return new MockQueryBuilder(tableName);
  },
  auth: {
    getSession: async () => {
      console.log('🎨 Preview Mode: Mock getSession');
      return { data: { session: null }, error: null };
    },
    signInWithPassword: async (credentials: any) => {
      console.log('🎨 Preview Mode: Mock signInWithPassword', credentials);
      return { 
        data: { 
          user: { id: 'preview-user-001', email: credentials.email },
          session: { user: { id: 'preview-user-001', email: credentials.email } }
        }, 
        error: null 
      };
    },
    signOut: async () => {
      console.log('🎨 Preview Mode: Mock signOut');
      return { error: null };
    },
    updateUser: async (updates: any) => {
      console.log('🎨 Preview Mode: Mock updateUser', updates);
      return { data: { user: { id: 'preview-user-001' } }, error: null };
    },
    onAuthStateChange: (callback: any) => {
      console.log('🎨 Preview Mode: Mock onAuthStateChange');
      return {
        data: {
          subscription: {
            unsubscribe: () => console.log('🎨 Preview Mode: Mock unsubscribe')
          }
        }
      };
    }
  },
  storage: {
    from: (bucket: string) => ({
      upload: async (path: string, file: any) => {
        console.log('🎨 Preview Mode: Mock storage upload', { bucket, path });
        return { data: { path }, error: null };
      },
      getPublicUrl: (path: string) => {
        console.log('🎨 Preview Mode: Mock getPublicUrl', { bucket, path });
        return { 
          data: { publicUrl: `https://preview.tillsup.com/storage/${bucket}/${path}` }
        };
      },
      remove: async (paths: string[]) => {
        console.log('🎨 Preview Mode: Mock storage remove', { bucket, paths });
        return { data: null, error: null };
      }
    })
  },
  rpc: async (functionName: string, params?: any) => {
    console.log('🎨 Preview Mode: Mock RPC call', { functionName, params });
    return { data: null, error: null };
  }
};

/**
 * Get Supabase client - returns mock client in preview mode
 */
export function getSupabaseClient() {
  if (isPreviewMode()) {
    console.log('🎨 Using mock Supabase client for preview mode');
    return mockSupabaseClient as any;
  }
  return supabase;
}

/**
 * Check if a Supabase operation should be mocked
 */
export function shouldMockSupabase(): boolean {
  return isPreviewMode();
}
