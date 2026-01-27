import { supabase } from '@/lib/supabase';
import type { MediaContent, MediaFormData } from '@/types/media';

const TABLE_NAME = 'projects';

export const mediaService = {
  /**
   * Fetch media content with optional server-side filtering
   */
  async fetchAll(filters?: { search?: string; status?: string; contentType?: string }): Promise<MediaContent[]> {
    let query = supabase
      .from(TABLE_NAME)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.search) {
      const searchTerms = filters.search.trim();
      // Searching across multiple columns using Supabase 'or'
      query = query.or(`title.ilike.%${searchTerms}%,platform.ilike.%${searchTerms}%,genres.ilike.%${searchTerms}%,notes.ilike.%${searchTerms}%`);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.contentType && filters.contentType !== 'all') {
      query = query.eq('content_type', filters.contentType);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch media: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Fetch a single media item by ID
   */
  async fetchById(id: string): Promise<MediaContent | null> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch media: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new media entry
   */
  async create(mediaData: MediaFormData): Promise<MediaContent> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([mediaData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create media: ${error.message}`);
    }

    return data;
  },

  /**
   * Update an existing media entry
   */
  async update(id: string, mediaData: Partial<MediaFormData>): Promise<MediaContent> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update(mediaData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update media: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete a media entry
   */
  async deletePermanent(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete media: ${error.message}`);
    }
  },

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File,
    bucket: string,
    path: string
  ): Promise<string> {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  },
  /**
   * Fetch unique status values from the database
   */
  async fetchUniqueStatuses(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('status');

    if (error) throw error;
    
    const statuses = data.map(item => item.status).filter(Boolean);
    return [...new Set(statuses)].sort();
  },

  /**
   * Fetch unique content type values from the database
   */
  async fetchUniqueContentTypes(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('content_type');

    if (error) throw error;
    
    const types = data.map(item => item.content_type).filter(Boolean);
    return [...new Set(types)].sort();
  },
};
