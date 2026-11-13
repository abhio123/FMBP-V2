
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "admin_actions": {
                  Row: {
                    "action": string,"admin_phone": string,"created_at": string,"data": NonNullable<Json>,"id": number,"note": string | null,"target_id": string | null,"target_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"admin_phone": string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"note"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"admin_phone"?: string,"created_at"?: string,"data"?: NonNullable<Json>,"id"?: never,"note"?: string | null,"target_id"?: string | null,"target_type"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"admins": {
                  Row: {
                    "added_by": string | null,"created_at": string,"disabled_at": string | null,"name": string,"phone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "added_by"?: string | null,"created_at"?: string,"disabled_at"?: string | null,"name": string,"phone": string
                  }
                  Update: {
                    "added_by"?: string | null,"created_at"?: string,"disabled_at"?: string | null,"name"?: string,"phone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"ai_calls": {
                  Row: {
                    "created_at": string,"id": number,"input_tokens": number,"output_tokens": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: never,"input_tokens"?: number,"output_tokens"?: number,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: never,"input_tokens"?: number,"output_tokens"?: number,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_calls_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"business_blocks": {
                  Row: {
                    "blocked_business_id": string,"blocker_business_id": string,"created_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "blocked_business_id": string,"blocker_business_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_business_id"?: string,"blocker_business_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_blocks_blocked_business_id_fkey"
      columns: ["blocked_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_blocks_blocked_business_id_fkey"
      columns: ["blocked_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_blocks_blocker_business_id_fkey"
      columns: ["blocker_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_blocks_blocker_business_id_fkey"
      columns: ["blocker_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"business_media": {
                  Row: {
                    "business_id": string,"created_at": string,"id": string,"kind": Database["public"]['Enums']["media_kind"],"sort": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"sort"?: number,"url": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"sort"?: number,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_media_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_media_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"business_offerings": {
                  Row: {
                    "advanced": NonNullable<Json>,"basic": NonNullable<Json>,"business_id": string,"city": string,"completion_score": number,"created_at": string,"deleted_at": string | null,"description": string | null,"id": string,"location": unknown,"offering_type_id": string,"search_tsv": unknown,"state": string | null,"status": Database["public"]['Enums']["offering_status"],"title": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "advanced"?: NonNullable<Json>,"basic"?: NonNullable<Json>,"business_id": string,"city": string,"completion_score"?: number,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"location": unknown,"offering_type_id": string,"search_tsv"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["offering_status"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "advanced"?: NonNullable<Json>,"basic"?: NonNullable<Json>,"business_id"?: string,"city"?: string,"completion_score"?: number,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"location"?: unknown,"offering_type_id"?: string,"search_tsv"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["offering_status"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_offerings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_offerings_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_offerings_offering_type_id_fkey"
      columns: ["offering_type_id"]
isOneToOne: false
      referencedRelation: "offering_types"
      referencedColumns: ["id"]
    }
                  ]
                },"business_verifications": {
                  Row: {
                    "business_id": string,"created_at": string,"doc_number": string | null,"doc_type": Database["public"]['Enums']["verification_doc_type"],"file_url": string | null,"id": string,"note": string | null,"reviewed_at": string | null,"status": Database["public"]['Enums']["verification_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"doc_number"?: string | null,"doc_type": Database["public"]['Enums']["verification_doc_type"],"file_url"?: string | null,"id"?: string,"note"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["verification_status"]
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"doc_number"?: string | null,"doc_type"?: Database["public"]['Enums']["verification_doc_type"],"file_url"?: string | null,"id"?: string,"note"?: string | null,"reviewed_at"?: string | null,"status"?: Database["public"]['Enums']["verification_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "business_verifications_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "business_verifications_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"businesses": {
                  Row: {
                    "boost_credits": number,"category_id": string,"category_other": string | null,"city": string,"completed_deals": number,"completion_score": number,"country": string,"cover_url": string | null,"created_at": string,"deleted_at": string | null,"delivery_available": boolean,"description": string | null,"email": string | null,"id": string,"kind": string,"location": unknown,"logo_url": string | null,"member_since": string,"name": string,"owner_id": string,"phone": string | null,"pickup_available": boolean,"pincode": string | null,"rating_avg": number,"rating_count": number,"referral_code": string | null,"referral_count": number,"response_rate": number,"response_sample": number,"service_available": boolean,"social": NonNullable<Json>,"state": string | null,"suspended_at": string | null,"suspension_reason": string | null,"trade": string | null,"trade_other": string | null,"updated_at": string,"verification_status": Database["public"]['Enums']["verification_status"],"website": string | null,"whatsapp": string | null,"working_hours": Json | null
                  }
                  ComputedFields: never
                  Insert: {
                    "boost_credits"?: number,"category_id": string,"category_other"?: string | null,"city": string,"completed_deals"?: number,"completion_score"?: number,"country"?: string,"cover_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"delivery_available"?: boolean,"description"?: string | null,"email"?: string | null,"id"?: string,"kind"?: string,"location": unknown,"logo_url"?: string | null,"member_since"?: string,"name": string,"owner_id": string,"phone"?: string | null,"pickup_available"?: boolean,"pincode"?: string | null,"rating_avg"?: number,"rating_count"?: number,"referral_code"?: string | null,"referral_count"?: number,"response_rate"?: number,"response_sample"?: number,"service_available"?: boolean,"social"?: NonNullable<Json>,"state"?: string | null,"suspended_at"?: string | null,"suspension_reason"?: string | null,"trade"?: string | null,"trade_other"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"website"?: string | null,"whatsapp"?: string | null,"working_hours"?: Json | null
                  }
                  Update: {
                    "boost_credits"?: number,"category_id"?: string,"category_other"?: string | null,"city"?: string,"completed_deals"?: number,"completion_score"?: number,"country"?: string,"cover_url"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"delivery_available"?: boolean,"description"?: string | null,"email"?: string | null,"id"?: string,"kind"?: string,"location"?: unknown,"logo_url"?: string | null,"member_since"?: string,"name"?: string,"owner_id"?: string,"phone"?: string | null,"pickup_available"?: boolean,"pincode"?: string | null,"rating_avg"?: number,"rating_count"?: number,"referral_code"?: string | null,"referral_count"?: number,"response_rate"?: number,"response_sample"?: number,"service_available"?: boolean,"social"?: NonNullable<Json>,"state"?: string | null,"suspended_at"?: string | null,"suspension_reason"?: string | null,"trade"?: string | null,"trade_other"?: string | null,"updated_at"?: string,"verification_status"?: Database["public"]['Enums']["verification_status"],"website"?: string | null,"whatsapp"?: string | null,"working_hours"?: Json | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "businesses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "businesses_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"categories": {
                  Row: {
                    "examples_en": (string)[],"examples_hi": (string)[],"icon": string | null,"id": string,"keywords": string | null,"name_en": string,"name_hi": string,"parent_id": string | null,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "examples_en"?: (string)[],"examples_hi"?: (string)[],"icon"?: string | null,"id"?: string,"keywords"?: string | null,"name_en": string,"name_hi": string,"parent_id"?: string | null,"slug": string,"sort"?: number
                  }
                  Update: {
                    "examples_en"?: (string)[],"examples_hi"?: (string)[],"icon"?: string | null,"id"?: string,"keywords"?: string | null,"name_en"?: string,"name_hi"?: string,"parent_id"?: string | null,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "categories_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"category_affinity": {
                  Row: {
                    "source_category_slug": string,"target_post_type_slug": string,"weight": number
                  }
                  ComputedFields: never
                  Insert: {
                    "source_category_slug": string,"target_post_type_slug": string,"weight": number
                  }
                  Update: {
                    "source_category_slug"?: string,"target_post_type_slug"?: string,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"conversations": {
                  Row: {
                    "business_a": string,"business_b": string,"created_at": string,"id": string,"last_message_at": string | null,"post_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "business_a": string,"business_b": string,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"post_id"?: string | null
                  }
                  Update: {
                    "business_a"?: string,"business_b"?: string,"created_at"?: string,"id"?: string,"last_message_at"?: string | null,"post_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_business_a_fkey"
      columns: ["business_a"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_business_a_fkey"
      columns: ["business_a"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_business_b_fkey"
      columns: ["business_b"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_business_b_fkey"
      columns: ["business_b"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"deals": {
                  Row: {
                    "business_a": string,"business_b": string,"completed_at": string | null,"confirmed_by_a": boolean,"confirmed_by_b": boolean,"counted": boolean,"created_at": string,"id": string,"post_id": string | null,"response_id": string | null,"status": Database["public"]['Enums']["deal_status"],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_a": string,"business_b": string,"completed_at"?: string | null,"confirmed_by_a"?: boolean,"confirmed_by_b"?: boolean,"counted"?: boolean,"created_at"?: string,"id"?: string,"post_id"?: string | null,"response_id"?: string | null,"status"?: Database["public"]['Enums']["deal_status"],"updated_at"?: string
                  }
                  Update: {
                    "business_a"?: string,"business_b"?: string,"completed_at"?: string | null,"confirmed_by_a"?: boolean,"confirmed_by_b"?: boolean,"counted"?: boolean,"created_at"?: string,"id"?: string,"post_id"?: string | null,"response_id"?: string | null,"status"?: Database["public"]['Enums']["deal_status"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "deals_business_a_fkey"
      columns: ["business_a"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_business_a_fkey"
      columns: ["business_a"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_business_b_fkey"
      columns: ["business_b"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_business_b_fkey"
      columns: ["business_b"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_response_id_fkey"
      columns: ["response_id"]
isOneToOne: false
      referencedRelation: "post_responses"
      referencedColumns: ["id"]
    }
                  ]
                },"follows": {
                  Row: {
                    "created_at": string,"followed_business_id": string,"follower_business_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"followed_business_id": string,"follower_business_id": string
                  }
                  Update: {
                    "created_at"?: string,"followed_business_id"?: string,"follower_business_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "follows_followed_business_id_fkey"
      columns: ["followed_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_followed_business_id_fkey"
      columns: ["followed_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_business_id_fkey"
      columns: ["follower_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "follows_follower_business_id_fkey"
      columns: ["follower_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"form_schemas": {
                  Row: {
                    "active": boolean,"created_at": string,"description_template": string,"description_template_hi": string | null,"fields": NonNullable<Json>,"id": string,"target": string,"title_template": string,"title_template_hi": string | null,"type_slug": string,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"description_template": string,"description_template_hi"?: string | null,"fields": NonNullable<Json>,"id"?: string,"target": string,"title_template": string,"title_template_hi"?: string | null,"type_slug": string,"version"?: number
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"description_template"?: string,"description_template_hi"?: string | null,"fields"?: NonNullable<Json>,"id"?: string,"target"?: string,"title_template"?: string,"title_template_hi"?: string | null,"type_slug"?: string,"version"?: number
                  }
                  Relationships: [
                    
                  ]
                },"intentions": {
                  Row: {
                    "icon": string | null,"id": string,"name_en": string,"name_hi": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "icon"?: string | null,"id"?: string,"name_en": string,"name_hi": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "icon"?: string | null,"id"?: string,"name_en"?: string,"name_hi"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"messages": {
                  Row: {
                    "attachment_url": string | null,"body": string | null,"conversation_id": string,"created_at": string,"id": string,"post_id": string | null,"read_at": string | null,"reply_to_id": string | null,"sender_business_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attachment_url"?: string | null,"body"?: string | null,"conversation_id": string,"created_at"?: string,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"reply_to_id"?: string | null,"sender_business_id": string
                  }
                  Update: {
                    "attachment_url"?: string | null,"body"?: string | null,"conversation_id"?: string,"created_at"?: string,"id"?: string,"post_id"?: string | null,"read_at"?: string | null,"reply_to_id"?: string | null,"sender_business_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_reply_to_id_fkey"
      columns: ["reply_to_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_business_id_fkey"
      columns: ["sender_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_business_id_fkey"
      columns: ["sender_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "created_at": string,"id": string,"kind": string,"payload": NonNullable<Json>,"read_at": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"offering_types": {
                  Row: {
                    "active": boolean,"icon": string | null,"id": string,"name_en": string,"name_hi": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"icon"?: string | null,"id"?: string,"name_en": string,"name_hi": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"icon"?: string | null,"id"?: string,"name_en"?: string,"name_hi"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    
                  ]
                },"opportunity_posts": {
                  Row: {
                    "advanced": NonNullable<Json>,"amount_max": number | null,"amount_min": number | null,"basic": NonNullable<Json>,"boosted_until": string | null,"business_id": string,"category_id": string | null,"city": string,"created_at": string,"deal_type": string | null,"deleted_at": string | null,"description": string | null,"edited_at": string | null,"expires_at": string,"hidden_at": string | null,"id": string,"kind_key": string,"location": unknown,"pincode": string | null,"post_type_id": string,"renewed_at": string | null,"renewed_count": number,"response_count": number,"search_terms": string,"search_tsv": unknown,"state": string | null,"status": Database["public"]['Enums']["post_status"],"title": string,"updated_at": string,"view_count": number
                  }
                  ComputedFields: never
                  Insert: {
                    "advanced"?: NonNullable<Json>,"amount_max"?: number | null,"amount_min"?: number | null,"basic"?: NonNullable<Json>,"boosted_until"?: string | null,"business_id": string,"category_id"?: string | null,"city": string,"created_at"?: string,"deal_type"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"edited_at"?: string | null,"expires_at"?: string,"hidden_at"?: string | null,"id"?: string,"kind_key"?: string,"location": unknown,"pincode"?: string | null,"post_type_id": string,"renewed_at"?: string | null,"renewed_count"?: number,"response_count"?: number,"search_terms"?: string,"search_tsv"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title": string,"updated_at"?: string,"view_count"?: number
                  }
                  Update: {
                    "advanced"?: NonNullable<Json>,"amount_max"?: number | null,"amount_min"?: number | null,"basic"?: NonNullable<Json>,"boosted_until"?: string | null,"business_id"?: string,"category_id"?: string | null,"city"?: string,"created_at"?: string,"deal_type"?: string | null,"deleted_at"?: string | null,"description"?: string | null,"edited_at"?: string | null,"expires_at"?: string,"hidden_at"?: string | null,"id"?: string,"kind_key"?: string,"location"?: unknown,"pincode"?: string | null,"post_type_id"?: string,"renewed_at"?: string | null,"renewed_count"?: number,"response_count"?: number,"search_terms"?: string,"search_tsv"?: never,"state"?: string | null,"status"?: Database["public"]['Enums']["post_status"],"title"?: string,"updated_at"?: string,"view_count"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opportunity_posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_posts_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "opportunity_posts_post_type_id_fkey"
      columns: ["post_type_id"]
isOneToOne: false
      referencedRelation: "post_types"
      referencedColumns: ["id"]
    }
                  ]
                },"post_media": {
                  Row: {
                    "id": string,"kind": Database["public"]['Enums']["media_kind"],"post_id": string,"sort": number,"url": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"post_id": string,"sort"?: number,"url": string
                  }
                  Update: {
                    "id"?: string,"kind"?: Database["public"]['Enums']["media_kind"],"post_id"?: string,"sort"?: number,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_media_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_responses": {
                  Row: {
                    "business_id": string,"conversation_id": string | null,"created_at": string,"id": string,"message": string | null,"post_id": string,"replied_at": string | null,"response_type": Database["public"]['Enums']["response_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"post_id": string,"replied_at"?: string | null,"response_type": Database["public"]['Enums']["response_type"]
                  }
                  Update: {
                    "business_id"?: string,"conversation_id"?: string | null,"created_at"?: string,"id"?: string,"message"?: string | null,"post_id"?: string,"replied_at"?: string | null,"response_type"?: Database["public"]['Enums']["response_type"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_responses_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_responses_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_responses_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_responses_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_tags": {
                  Row: {
                    "post_id": string,"tag": string
                  }
                  ComputedFields: never
                  Insert: {
                    "post_id": string,"tag": string
                  }
                  Update: {
                    "post_id"?: string,"tag"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_tags_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"post_types": {
                  Row: {
                    "active": boolean,"advanced_label_en": string | null,"advanced_label_hi": string | null,"category_hint": string | null,"examples_en": (string)[],"examples_hi": (string)[],"for_individuals": boolean,"icon": string | null,"id": string,"intention_id": string,"keywords": string | null,"name_en": string,"name_hi": string,"plain_label_en": string,"plain_label_hi": string,"slug": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"advanced_label_en"?: string | null,"advanced_label_hi"?: string | null,"category_hint"?: string | null,"examples_en"?: (string)[],"examples_hi"?: (string)[],"for_individuals"?: boolean,"icon"?: string | null,"id"?: string,"intention_id": string,"keywords"?: string | null,"name_en": string,"name_hi": string,"plain_label_en": string,"plain_label_hi": string,"slug": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"advanced_label_en"?: string | null,"advanced_label_hi"?: string | null,"category_hint"?: string | null,"examples_en"?: (string)[],"examples_hi"?: (string)[],"for_individuals"?: boolean,"icon"?: string | null,"id"?: string,"intention_id"?: string,"keywords"?: string | null,"name_en"?: string,"name_hi"?: string,"plain_label_en"?: string,"plain_label_hi"?: string,"slug"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_types_category_hint_fkey"
      columns: ["category_hint"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_types_intention_id_fkey"
      columns: ["intention_id"]
isOneToOne: false
      referencedRelation: "intentions"
      referencedColumns: ["id"]
    }
                  ]
                },"post_views": {
                  Row: {
                    "business_id": string | null,"id": number,"post_id": string,"viewed_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id"?: string | null,"id"?: never,"post_id": string,"viewed_at"?: string
                  }
                  Update: {
                    "business_id"?: string | null,"id"?: never,"post_id"?: string,"viewed_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "post_views_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_views_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "post_views_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "expo_token": string,"platform": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "expo_token": string,"platform": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "expo_token"?: string,"platform"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                },"referrals": {
                  Row: {
                    "created_at": string,"qualified_at": string | null,"referred_business_id": string,"referrer_business_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"qualified_at"?: string | null,"referred_business_id": string,"referrer_business_id": string
                  }
                  Update: {
                    "created_at"?: string,"qualified_at"?: string | null,"referred_business_id"?: string,"referrer_business_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "referrals_referred_business_id_fkey"
      columns: ["referred_business_id"]
isOneToOne: true
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_referred_business_id_fkey"
      columns: ["referred_business_id"]
isOneToOne: true
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_referrer_business_id_fkey"
      columns: ["referrer_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referrals_referrer_business_id_fkey"
      columns: ["referrer_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"details": string | null,"id": string,"reason": string,"reporter_business_id": string,"status": string,"target_id": string,"target_type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason": string,"reporter_business_id": string,"status"?: string,"target_id": string,"target_type": string
                  }
                  Update: {
                    "created_at"?: string,"details"?: string | null,"id"?: string,"reason"?: string,"reporter_business_id"?: string,"status"?: string,"target_id"?: string,"target_type"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_reporter_business_id_fkey"
      columns: ["reporter_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_business_id_fkey"
      columns: ["reporter_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"reviews": {
                  Row: {
                    "created_at": string,"deal_id": string,"id": string,"rating": number,"revealed_at": string | null,"reviewee_business_id": string,"reviewer_business_id": string,"text": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deal_id": string,"id"?: string,"rating": number,"revealed_at"?: string | null,"reviewee_business_id": string,"reviewer_business_id": string,"text"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"deal_id"?: string,"id"?: string,"rating"?: number,"revealed_at"?: string | null,"reviewee_business_id"?: string,"reviewer_business_id"?: string,"text"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "reviews_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_business_id_fkey"
      columns: ["reviewee_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewee_business_id_fkey"
      columns: ["reviewee_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_business_id_fkey"
      columns: ["reviewer_business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reviews_reviewer_business_id_fkey"
      columns: ["reviewer_business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_posts": {
                  Row: {
                    "business_id": string,"created_at": string,"post_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "business_id": string,"created_at"?: string,"post_id": string
                  }
                  Update: {
                    "business_id"?: string,"created_at"?: string,"post_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_posts_business_id_fkey"
      columns: ["business_id"]
isOneToOne: false
      referencedRelation: "businesses_public"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_posts_post_id_fkey"
      columns: ["post_id"]
isOneToOne: false
      referencedRelation: "opportunity_posts"
      referencedColumns: ["id"]
    }
                  ]
                },"spatial_ref_sys": {
                  Row: {
                    "auth_name": string | null,"auth_srid": number | null,"proj4text": string | null,"srid": number,"srtext": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_name"?: string | null,"auth_srid"?: number | null,"proj4text"?: string | null,"srid": number,"srtext"?: string | null
                  }
                  Update: {
                    "auth_name"?: string | null,"auth_srid"?: number | null,"proj4text"?: string | null,"srid"?: number,"srtext"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"users": {
                  Row: {
                    "created_at": string,"deletion_requested_at": string | null,"email": string | null,"erased_at": string | null,"id": string,"language": string,"name": string,"notification_prefs": NonNullable<Json>,"phone": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"erased_at"?: string | null,"id": string,"language"?: string,"name"?: string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"deletion_requested_at"?: string | null,"email"?: string | null,"erased_at"?: string | null,"id"?: string,"language"?: string,"name"?: string,"notification_prefs"?: NonNullable<Json>,"phone"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"word_counts": {
                  Row: {
                    "city": string,"found_nothing": number,"section": string,"source": string,"state": string,"uses": number,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "city"?: string,"found_nothing"?: number,"section"?: string,"source": string,"state"?: string,"uses"?: number,"word": string
                  }
                  Update: {
                    "city"?: string,"found_nothing"?: number,"section"?: string,"source"?: string,"state"?: string,"uses"?: number,"word"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_counts_word_fkey"
      columns: ["word"]
isOneToOne: false
      referencedRelation: "word_insights"
      referencedColumns: ["word"]
    }
                  ]
                },"word_insights": {
                  Row: {
                    "first_seen": string,"last_seen": string,"reviewed_at": string | null,"reviewed_by": string | null,"status": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "first_seen"?: string,"last_seen"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"word": string
                  }
                  Update: {
                    "first_seen"?: string,"last_seen"?: string,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: string,"word"?: string
                  }
                  Relationships: [
                    
                  ]
                },"word_seen": {
                  Row: {
                    "seen_on": string,"source": string,"user_id": string,"word": string
                  }
                  ComputedFields: never
                  Insert: {
                    "seen_on"?: string,"source": string,"user_id": string,"word": string
                  }
                  Update: {
                    "seen_on"?: string,"source"?: string,"user_id"?: string,"word"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "word_seen_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "users"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "businesses_public": {
                  Row: {
                    "category_id": string,"city": string,"completed_deals": number,"completion_score": number,"country": string,"cover_url": string | null,"created_at": string,"delivery_available": boolean,"description": string | null,"id": string,"kind": string,"logo_url": string | null,"member_since": string,"name": string,"pickup_available": boolean,"pincode": string | null,"rating_avg": number,"rating_count": number,"referral_count": number,"response_rate": number,"response_sample": number,"service_available": boolean,"state": string | null,"trade": string | null,"trade_other": string | null,"verification_status": Database["public"]['Enums']["verification_status"]
                  }
                  ComputedFields: never
                  Insert: {
                           "category_id"?: string | null,"city"?: string | null,"completed_deals"?: number | null,"completion_score"?: number | null,"country"?: string | null,"cover_url"?: string | null,"created_at"?: string | null,"delivery_available"?: boolean | null,"description"?: string | null,"id"?: string | null,"kind"?: string | null,"logo_url"?: string | null,"member_since"?: string | null,"name"?: string | null,"pickup_available"?: boolean | null,"pincode"?: string | null,"rating_avg"?: number | null,"rating_count"?: number | null,"referral_count"?: number | null,"response_rate"?: number | null,"response_sample"?: number | null,"service_available"?: boolean | null,"state"?: string | null,"trade"?: string | null,"trade_other"?: string | null,"verification_status"?: Database["public"]['Enums']["verification_status"] | null
                         }
                        Update: {
                           "category_id"?: string | null,"city"?: string | null,"completed_deals"?: number | null,"completion_score"?: number | null,"country"?: string | null,"cover_url"?: string | null,"created_at"?: string | null,"delivery_available"?: boolean | null,"description"?: string | null,"id"?: string | null,"kind"?: string | null,"logo_url"?: string | null,"member_since"?: string | null,"name"?: string | null,"pickup_available"?: boolean | null,"pincode"?: string | null,"rating_avg"?: number | null,"rating_count"?: number | null,"referral_count"?: number | null,"response_rate"?: number | null,"response_sample"?: number | null,"service_available"?: boolean | null,"state"?: string | null,"trade"?: string | null,"trade_other"?: string | null,"verification_status"?: Database["public"]['Enums']["verification_status"] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "businesses_category_id_fkey"
      columns: ["category_id"]
isOneToOne: false
      referencedRelation: "categories"
      referencedColumns: ["id"]
    }
                  ]
                },"geography_columns": {
                  Row: {
                    "coord_dimension": number | null,"f_geography_column": unknown,"f_table_catalog": unknown,"f_table_name": unknown,"f_table_schema": unknown,"srid": number | null,"type": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"geometry_columns": {
                  Row: {
                    "coord_dimension": number | null,"f_geometry_column": unknown,"f_table_catalog": string | null,"f_table_name": unknown,"f_table_schema": unknown,"srid": number | null,"type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                           "coord_dimension"?: number | null,"f_geometry_column"?: unknown,"f_table_catalog"?: string | null,"f_table_name"?: unknown,"f_table_schema"?: unknown,"srid"?: number | null,"type"?: string | null
                         }
                        Update: {
                           "coord_dimension"?: number | null,"f_geometry_column"?: unknown,"f_table_catalog"?: string | null,"f_table_name"?: unknown,"f_table_schema"?: unknown,"srid"?: number | null,"type"?: string | null
                         }
                        Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_postgis_deprecate":
{ Args: { "newname": string,"oldname": string,"version": string }; Returns: undefined
                           },
"_postgis_index_extent":
{ Args: { "col": string,"tbl": unknown }; Returns: unknown
                           },
"_postgis_pgsql_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_postgis_scripts_pgsql_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"_postgis_selectivity":
{ Args: { "att_name": string,"geom": unknown,"mode"?: string,"tbl": unknown }; Returns: number
                           },
"_postgis_stats":
{ Args: { ""?: string,"att_name": string,"tbl": unknown }; Returns: string
                           },
"_st_3dintersects":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_contains":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_containsproperly":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_coveredby":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: boolean
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_covers":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: boolean
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_crosses":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_dwithin":
{ Args: { "geog1": unknown,"geog2": unknown,"tolerance": number,"use_spheroid"?: boolean }; Returns: boolean
                           },
"_st_equals":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_intersects":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_linecrossingdirection":
{ Args: { "line1": unknown,"line2": unknown }; Returns: number
                           },
"_st_longestline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"_st_maxdistance":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"_st_orderingequals":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_overlaps":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_sortablehash":
{ Args: { "geom": unknown }; Returns: number
                           },
"_st_touches":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"_st_voronoi":
{ Args: { "clip"?: unknown,"g1": unknown,"return_polygons"?: boolean,"tolerance"?: number }; Returns: unknown
                           },
"_st_within":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"addauth":
{ Args: { "": string }; Returns: boolean
                           },
"addgeometrycolumn":
{ Args: { "catalog_name": string,"column_name": string,"new_dim": number,"new_srid_in": number,"new_type": string,"schema_name": string,"table_name": string,"use_typmod"?: boolean }; Returns: string
                           } |
{ Args: { "column_name": string,"new_dim": number,"new_srid": number,"new_type": string,"schema_name": string,"table_name": string,"use_typmod"?: boolean }; Returns: string
                           } |
{ Args: { "column_name": string,"new_dim": number,"new_srid": number,"new_type": string,"table_name": string,"use_typmod"?: boolean }; Returns: string
                           },
"admin_add_admin":
{ Args: { "p_name": string,"p_phone": string }; Returns: undefined
                           },
"admin_broadcast":
{ Args: { "p_body_en": string,"p_body_hi": string,"p_city"?: string,"p_title_en": string,"p_title_hi": string }; Returns: number
                           },
"admin_broadcasts":
{ Args: { "p_limit"?: number }; Returns: {
              "admin_name": string,"admin_phone": string,"body_en": string,"body_hi": string,"city": string,"created_at": string,"id": number,"recipients": number,"title_en": string,"title_hi": string
            }[]
                           },
"admin_business":
{ Args: { "p_business_id": string }; Returns: Json
                           },
"admin_business_posts":
{ Args: { "p_business_id": string }; Returns: {
              "created_at": string,"hidden": boolean,"icon": string,"id": string,"removed": boolean,"status": string,"title": string
            }[]
                           },
"admin_delete_word":
{ Args: { "p_word": string }; Returns: undefined
                           },
"admin_disable_admin":
{ Args: { "p_phone": string }; Returns: undefined
                           },
"admin_list_admins":
{ Args: Record<PropertyKey, never>; Returns: {
              "added_by": string,"created_at": string,"disabled_at": string,"is_me": boolean,"name": string,"phone": string
            }[]
                           },
"admin_list_businesses":
{ Args: { "p_filter"?: string,"p_limit"?: number,"p_offset"?: number }; Returns: {
              "city": string,"created_at": string,"deleted_at": string,"erase_on": string,"id": string,"logo_url": string,"name": string,"owner_phone": string,"posts_live": number,"suspended_at": string,"suspension_reason": string,"verification_status": string
            }[]
                           },
"admin_list_deals":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "business_a": string,"business_a_name": string,"business_b": string,"business_b_name": string,"completed_at": string,"counted": boolean,"id": string,"post_icon": string,"post_title": string
            }[]
                           },
"admin_list_posts":
{ Args: { "p_filter"?: string,"p_limit"?: number,"p_offset"?: number }; Returns: {
              "business_id": string,"business_name": string,"city": string,"created_at": string,"hidden": boolean,"icon": string,"id": string,"removed": boolean,"response_count": number,"status": string,"title": string
            }[]
                           },
"admin_list_responses":
{ Args: { "p_limit"?: number,"p_offset"?: number }; Returns: {
              "created_at": string,"id": string,"owner_id": string,"owner_name": string,"post_icon": string,"post_id": string,"post_title": string,"responder_id": string,"responder_name": string,"response_type": string
            }[]
                           },
"admin_log":
{ Args: { "p_limit"?: number }; Returns: {
              "action": string,"admin_name": string,"admin_phone": string,"created_at": string,"data": Json,"id": number,"note": string,"target_id": string,"target_type": string
            }[]
                           },
"admin_remove_post":
{ Args: { "p_post_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_rename_word":
{ Args: { "p_new_word": string,"p_word": string }; Returns: undefined
                           },
"admin_reports":
{ Args: { "p_status"?: string }; Returns: {
              "body": string,"business_id": string,"business_name": string,"details": (string)[],"first_at": string,"hidden": boolean,"last_at": string,"reasons": (string)[],"removed": boolean,"reports": number,"suspended": boolean,"target_id": string,"target_type": string,"title": string
            }[]
                           },
"admin_resolve_report":
{ Args: { "p_action": string,"p_note"?: string,"p_target_id": string,"p_target_type": string }; Returns: undefined
                           },
"admin_restore_post":
{ Args: { "p_note"?: string,"p_post_id": string }; Returns: undefined
                           },
"admin_review_verification":
{ Args: { "p_approve": boolean,"p_id": string,"p_note"?: string }; Returns: undefined
                           },
"admin_revoke_verification":
{ Args: { "p_business_id": string,"p_note": string }; Returns: undefined
                           },
"admin_search":
{ Args: { "p_q": string }; Returns: {
              "business_id": string,"created_at": string,"flags": (string)[],"id": string,"kind": string,"subtitle": string,"title": string
            }[]
                           },
"admin_set_word_status":
{ Args: { "p_status": string,"p_word": string }; Returns: undefined
                           },
"admin_settings":
{ Args: Record<PropertyKey, never>; Returns: {
              "key": string,"note": string,"updated_at": string,"value": Json
            }[]
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_suspend_business":
{ Args: { "p_business_id": string,"p_reason": string }; Returns: undefined
                           },
"admin_unsuspend_business":
{ Args: { "p_business_id": string,"p_note"?: string }; Returns: undefined
                           },
"admin_update_setting":
{ Args: { "p_key": string,"p_value": Json }; Returns: undefined
                           },
"admin_verifications":
{ Args: { "p_status"?: Database["public"]['Enums']["verification_status"] }; Returns: {
              "business_id": string,"business_name": string,"city": string,"created_at": string,"doc_number": string,"doc_type": string,"file_path": string,"id": string,"note": string,"reviewed_at": string,"status": string
            }[]
                           },
"admin_word_regions":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_word_status_counts":
{ Args: { "p_city"?: string,"p_flow"?: string,"p_only_nothing"?: boolean,"p_state"?: string }; Returns: Json
                           },
"admin_words":
{ Args: { "p_city"?: string,"p_flow"?: string,"p_limit"?: number,"p_offset"?: number,"p_only_nothing"?: boolean,"p_state"?: string,"p_status"?: string }; Returns: Json
                           },
"admin_words_export":
{ Args: { "p_city"?: string,"p_flow"?: string,"p_only_nothing"?: boolean,"p_state"?: string,"p_status"?: string }; Returns: Json
                           },
"am_i_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"apply_referral_code":
{ Args: { "p_code": string }; Returns: undefined
                           },
"boost_post":
{ Args: { "p_post_id": string }; Returns: string
                           },
"business_deals":
{ Args: { "p_business_id": string,"p_limit"?: number }; Returns: {
              "completed_at": string,"post_icon": string,"post_title": string
            }[]
                           },
"cancel_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"chat_post_refs":
{ Args: { "p_conversation": string,"p_post_ids": (string)[] }; Returns: {
              "deleted": boolean,"icon": string,"id": string,"status": Database["public"]['Enums']["post_status"],"title": string
            }[]
                           },
"close_post_with_deal":
{ Args: { "p_partner_id"?: string,"p_post_id": string }; Returns: string
                           },
"deal_candidates":
{ Args: { "p_post_id": string }; Returns: {
              "business_id": string,"logo_url": string,"name": string
            }[]
                           },
"deals_done_count":
{ Args: { "p_city"?: string }; Returns: number
                           },
"disablelongtransactions":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"dropgeometrycolumn":
{ Args: { "catalog_name": string,"column_name": string,"schema_name": string,"table_name": string }; Returns: string
                           } |
{ Args: { "column_name": string,"schema_name": string,"table_name": string }; Returns: string
                           } |
{ Args: { "column_name": string,"table_name": string }; Returns: string
                           },
"dropgeometrytable":
{ Args: { "catalog_name": string,"schema_name": string,"table_name": string }; Returns: string
                           } |
{ Args: { "schema_name": string,"table_name": string }; Returns: string
                           } |
{ Args: { "table_name": string }; Returns: string
                           },
"enablelongtransactions":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"equals":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"feed_nearby":
{ Args: { "p_lat": number,"p_limit"?: number,"p_lng": number,"p_offset"?: number,"p_radius_km"?: number }; Returns: {
              "distance_km": number,"id": string
            }[]
                           },
"feed_recommended":
{ Args: { "p_business_id": string,"p_limit"?: number,"p_offset"?: number }; Returns: {
              "discovery": boolean,"id": string,"score": number
            }[]
                           },
"feed_social_proof":
{ Args: { "p_city"?: string }; Returns: {
              "city": string,"count": number,"kind": string
            }[]
                           },
"find_live_duplicate":
{ Args: { "p_advanced": Json,"p_basic": Json,"p_business_id": string,"p_exclude"?: string,"p_post_type_id": string }; Returns: string
                           },
"geometry":
{ Args: { "": string }; Returns: unknown
                           },
"geometry_above":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_below":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_cmp":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"geometry_contained_3d":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_contains":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_contains_3d":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_distance_box":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"geometry_distance_centroid":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"geometry_eq":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_ge":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_gt":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_le":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_left":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_lt":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overabove":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overbelow":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overlaps":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overlaps_3d":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overleft":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_overright":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_right":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_same":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_same_3d":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geometry_within":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"geomfromewkt":
{ Args: { "": string }; Returns: unknown
                           },
"get_my_business_details":
{ Args: { "p_business_id": string }; Returns: {
              "category_id": string,"city": string,"completion_score": number,"cover_url": string,"delivery_available": boolean,"description": string,"email": string,"id": string,"logo_url": string,"name": string,"phone": string,"pickup_available": boolean,"service_available": boolean,"social": Json,"verification_status": Database["public"]['Enums']["verification_status"],"website": string,"whatsapp": string,"working_hours": Json
            }[]
                           },
"gettransactionid":
{ Args: Record<PropertyKey, never>; Returns: unknown
                           },
"longtransactionsenabled":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"media_erased":
{ Args: { "p_business_ids": (string)[] }; Returns: undefined
                           },
"media_to_erase":
{ Args: { "p_limit"?: number }; Returns: string[]
                           },
"my_deals":
{ Args: { "p_business_id": string }; Returns: {
              "completed_at": string,"counted": boolean,"created_at": string,"i_am_owner": boolean,"id": string,"my_rating": number,"other_id": string,"other_logo": string,"other_name": string,"post_icon": string,"post_id": string,"post_title": string,"status": Database["public"]['Enums']["deal_status"],"their_rating": number
            }[]
                           },
"my_referral":
{ Args: { "p_business_id": string }; Returns: {
              "boost_credits": number,"can_enter_code": boolean,"code": string,"pending": number,"referral_count": number,"referred_by": string
            }[]
                           },
"populate_geometry_columns":
{ Args: { "tbl_oid": unknown,"use_typmod"?: boolean }; Returns: number
                           } |
{ Args: { "use_typmod"?: boolean }; Returns: string
                           },
"postgis_constraint_dims":
{ Args: { "geomcolumn": string,"geomschema": string,"geomtable": string }; Returns: number
                           },
"postgis_constraint_srid":
{ Args: { "geomcolumn": string,"geomschema": string,"geomtable": string }; Returns: number
                           },
"postgis_constraint_type":
{ Args: { "geomcolumn": string,"geomschema": string,"geomtable": string }; Returns: string
                           },
"postgis_extensions_upgrade":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_full_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_geos_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_lib_build_date":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_lib_revision":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_lib_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_libjson_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_liblwgeom_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_libprotobuf_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_libxml_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_proj_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_scripts_build_date":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_scripts_installed":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_scripts_released":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_svn_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_type_name":
{ Args: { "coord_dimension": number,"geomname": string,"use_new_name"?: boolean }; Returns: string
                           },
"postgis_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"postgis_wagyu_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"rate_deal":
{ Args: { "p_deal_id": string,"p_rating": number,"p_text"?: string }; Returns: undefined
                           },
"record_ai_usage":
{ Args: { "p_id": number,"p_input": number,"p_output": number }; Returns: undefined
                           },
"record_word":
{ Args: { "p_business_id"?: string,"p_found": boolean,"p_section"?: string,"p_source": string,"p_word": string }; Returns: undefined
                           },
"renew_post":
{ Args: { "p_post_id": string }; Returns: undefined
                           },
"request_account_deletion":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"request_verification":
{ Args: { "p_business_id": string,"p_doc_number": string,"p_doc_type": Database["public"]['Enums']["verification_doc_type"],"p_file_path": string }; Returns: string
                           },
"reserve_ai_call":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"respond_to_deal":
{ Args: { "p_confirm": boolean,"p_deal_id": string }; Returns: undefined
                           },
"run_erase_deleted_accounts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"run_expire_posts":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"run_recompute_response_rates":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"search_all":
{ Args: { "p_limit"?: number,"p_q": string }; Returns: {
              "entity": string,"id": string,"rank": number
            }[]
                           },
"show_limit":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"show_trgm":
{ Args: { "": string }; Returns: (string)[]
                           },
"st_3dclosestpoint":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_3ddistance":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_3dintersects":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_3dlongestline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_3dmakebox":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_3dmaxdistance":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_3dshortestline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_addpoint":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_angle":
{ Args: { "line1": unknown,"line2": unknown }; Returns: number
                           } |
{ Args: { "pt1": unknown,"pt2": unknown,"pt3": unknown,"pt4"?: unknown }; Returns: number
                           },
"st_area":
{ Args: { "geog": unknown,"use_spheroid"?: boolean }; Returns: number
                           } |
{ Args: { "": string }; Returns: number
                           },
"st_asencodedpolyline":
{ Args: { "geom": unknown,"nprecision"?: number }; Returns: string
                           },
"st_asewkt":
{ Args: { "": string }; Returns: string
                           },
"st_asgeojson":
{ Args: { "geog": unknown,"maxdecimaldigits"?: number,"options"?: number }; Returns: string
                           } |
{ Args: { "geom": unknown,"maxdecimaldigits"?: number,"options"?: number }; Returns: string
                           } |
{ Args: { "geom_column"?: string,"maxdecimaldigits"?: number,"pretty_bool"?: boolean,"r": Record<string, unknown> }; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           },
"st_asgml":
{ Args: { "geog": unknown,"id"?: string,"maxdecimaldigits"?: number,"nprefix"?: string,"options"?: number }; Returns: string
                           } |
{ Args: { "geom": unknown,"maxdecimaldigits"?: number,"options"?: number }; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           } |
{ Args: { "geog": unknown,"id"?: string,"maxdecimaldigits"?: number,"nprefix"?: string,"options"?: number,"version": number }; Returns: string
                           } |
{ Args: { "geom": unknown,"id"?: string,"maxdecimaldigits"?: number,"nprefix"?: string,"options"?: number,"version": number }; Returns: string
                           },
"st_askml":
{ Args: { "geog": unknown,"maxdecimaldigits"?: number,"nprefix"?: string }; Returns: string
                           } |
{ Args: { "geom": unknown,"maxdecimaldigits"?: number,"nprefix"?: string }; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           },
"st_aslatlontext":
{ Args: { "geom": unknown,"tmpl"?: string }; Returns: string
                           },
"st_asmarc21":
{ Args: { "format"?: string,"geom": unknown }; Returns: string
                           },
"st_asmvtgeom":
{ Args: { "bounds": unknown,"buffer"?: number,"clip_geom"?: boolean,"extent"?: number,"geom": unknown }; Returns: unknown
                           },
"st_assvg":
{ Args: { "geog": unknown,"maxdecimaldigits"?: number,"rel"?: number }; Returns: string
                           } |
{ Args: { "geom": unknown,"maxdecimaldigits"?: number,"rel"?: number }; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           },
"st_astext":
{ Args: { "": string }; Returns: string
                           },
"st_astwkb":
{ Args: { "geom": unknown,"prec"?: number,"prec_m"?: number,"prec_z"?: number,"with_boxes"?: boolean,"with_sizes"?: boolean }; Returns: string
                           } |
{ Args: { "geom": (unknown)[],"ids": (number)[],"prec"?: number,"prec_m"?: number,"prec_z"?: number,"with_boxes"?: boolean,"with_sizes"?: boolean }; Returns: string
                           },
"st_asx3d":
{ Args: { "geom": unknown,"maxdecimaldigits"?: number,"options"?: number }; Returns: string
                           },
"st_azimuth":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: number
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_boundingdiagonal":
{ Args: { "fits"?: boolean,"geom": unknown }; Returns: unknown
                           },
"st_buffer":
{ Args: { "geom": unknown,"options"?: string,"radius": number }; Returns: unknown
                           } |
{ Args: { "geom": unknown,"quadsegs": number,"radius": number }; Returns: unknown
                           },
"st_centroid":
{ Args: { "": string }; Returns: unknown
                           },
"st_clipbybox2d":
{ Args: { "box": unknown,"geom": unknown }; Returns: unknown
                           },
"st_closestpoint":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_collect":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_concavehull":
{ Args: { "param_allow_holes"?: boolean,"param_geom": unknown,"param_pctconvex": number }; Returns: unknown
                           },
"st_contains":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_containsproperly":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_coorddim":
{ Args: { "geometry": unknown }; Returns: number
                           },
"st_coveredby":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: boolean
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_covers":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: boolean
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_crosses":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_curvetoline":
{ Args: { "flags"?: number,"geom": unknown,"tol"?: number,"toltype"?: number }; Returns: unknown
                           },
"st_delaunaytriangles":
{ Args: { "flags"?: number,"g1": unknown,"tolerance"?: number }; Returns: unknown
                           },
"st_difference":
{ Args: { "geom1": unknown,"geom2": unknown,"gridsize"?: number }; Returns: unknown
                           },
"st_disjoint":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_distance":
{ Args: { "geog1": unknown,"geog2": unknown,"use_spheroid"?: boolean }; Returns: number
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_distancesphere":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           } |
{ Args: { "geom1": unknown,"geom2": unknown,"radius": number }; Returns: number
                           },
"st_distancespheroid":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_dwithin":
{ Args: { "geog1": unknown,"geog2": unknown,"tolerance": number,"use_spheroid"?: boolean }; Returns: boolean
                           },
"st_equals":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_expand":
{ Args: { "box": unknown,"dx": number,"dy": number }; Returns: unknown
                           } |
{ Args: { "box": unknown,"dx": number,"dy": number,"dz"?: number }; Returns: unknown
                           } |
{ Args: { "dm"?: number,"dx": number,"dy": number,"dz"?: number,"geom": unknown }; Returns: unknown
                           },
"st_force3d":
{ Args: { "geom": unknown,"zvalue"?: number }; Returns: unknown
                           },
"st_force3dm":
{ Args: { "geom": unknown,"mvalue"?: number }; Returns: unknown
                           },
"st_force3dz":
{ Args: { "geom": unknown,"zvalue"?: number }; Returns: unknown
                           },
"st_force4d":
{ Args: { "geom": unknown,"mvalue"?: number,"zvalue"?: number }; Returns: unknown
                           },
"st_generatepoints":
{ Args: { "area": unknown,"npoints": number }; Returns: unknown
                           } |
{ Args: { "area": unknown,"npoints": number,"seed": number }; Returns: unknown
                           },
"st_geogfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_geographyfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_geohash":
{ Args: { "geog": unknown,"maxchars"?: number }; Returns: string
                           } |
{ Args: { "geom": unknown,"maxchars"?: number }; Returns: string
                           },
"st_geomcollfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_geometricmedian":
{ Args: { "fail_if_not_converged"?: boolean,"g": unknown,"max_iter"?: number,"tolerance"?: number }; Returns: unknown
                           },
"st_geometryfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_geomfromewkt":
{ Args: { "": string }; Returns: unknown
                           },
"st_geomfromgeojson":
{ Args: { "": Json }; Returns: unknown
                           } |
{ Args: { "": Json }; Returns: unknown
                           } |
{ Args: { "": string }; Returns: unknown
                           },
"st_geomfromgml":
{ Args: { "": string }; Returns: unknown
                           },
"st_geomfromkml":
{ Args: { "": string }; Returns: unknown
                           },
"st_geomfrommarc21":
{ Args: { "marc21xml": string }; Returns: unknown
                           },
"st_geomfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_gmltosql":
{ Args: { "": string }; Returns: unknown
                           },
"st_hasarc":
{ Args: { "geometry": unknown }; Returns: boolean
                           },
"st_hausdorffdistance":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_hexagon":
{ Args: { "cell_i": number,"cell_j": number,"origin"?: unknown,"size": number }; Returns: unknown
                           },
"st_hexagongrid":
{ Args: { "bounds": unknown,"size": number }; Returns: Record<string, unknown>[]
                           },
"st_interpolatepoint":
{ Args: { "line": unknown,"point": unknown }; Returns: number
                           },
"st_intersection":
{ Args: { "geom1": unknown,"geom2": unknown,"gridsize"?: number }; Returns: unknown
                           },
"st_intersects":
{ Args: { "geog1": unknown,"geog2": unknown }; Returns: boolean
                           } |
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_isvaliddetail":
{ Args: { "flags"?: number,"geom": unknown }; Returns: Database["public"]['CompositeTypes']["valid_detail"]
                          SetofOptions: {
        from: "*"
        to: "valid_detail"
        isOneToOne: true
        isSetofReturn: false
      } },
"st_length":
{ Args: { "geog": unknown,"use_spheroid"?: boolean }; Returns: number
                           } |
{ Args: { "": string }; Returns: number
                           },
"st_letters":
{ Args: { "font"?: Json,"letters": string }; Returns: unknown
                           },
"st_linecrossingdirection":
{ Args: { "line1": unknown,"line2": unknown }; Returns: number
                           },
"st_linefromencodedpolyline":
{ Args: { "nprecision"?: number,"txtin": string }; Returns: unknown
                           },
"st_linefromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_linelocatepoint":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_linetocurve":
{ Args: { "geometry": unknown }; Returns: unknown
                           },
"st_locatealong":
{ Args: { "geometry": unknown,"leftrightoffset"?: number,"measure": number }; Returns: unknown
                           },
"st_locatebetween":
{ Args: { "frommeasure": number,"geometry": unknown,"leftrightoffset"?: number,"tomeasure": number }; Returns: unknown
                           },
"st_locatebetweenelevations":
{ Args: { "fromelevation": number,"geometry": unknown,"toelevation": number }; Returns: unknown
                           },
"st_longestline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_makebox2d":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_makeline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_makevalid":
{ Args: { "geom": unknown,"params": string }; Returns: unknown
                           },
"st_maxdistance":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: number
                           },
"st_minimumboundingcircle":
{ Args: { "inputgeom": unknown,"segs_per_quarter"?: number }; Returns: unknown
                           },
"st_mlinefromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_mpointfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_mpolyfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_multilinestringfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_multipointfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_multipolygonfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_node":
{ Args: { "g": unknown }; Returns: unknown
                           },
"st_normalize":
{ Args: { "geom": unknown }; Returns: unknown
                           },
"st_offsetcurve":
{ Args: { "distance": number,"line": unknown,"params"?: string }; Returns: unknown
                           },
"st_orderingequals":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_overlaps":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_perimeter":
{ Args: { "geog": unknown,"use_spheroid"?: boolean }; Returns: number
                           },
"st_pointfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_pointm":
{ Args: { "mcoordinate": number,"srid"?: number,"xcoordinate": number,"ycoordinate": number }; Returns: unknown
                           },
"st_pointz":
{ Args: { "srid"?: number,"xcoordinate": number,"ycoordinate": number,"zcoordinate": number }; Returns: unknown
                           },
"st_pointzm":
{ Args: { "mcoordinate": number,"srid"?: number,"xcoordinate": number,"ycoordinate": number,"zcoordinate": number }; Returns: unknown
                           },
"st_polyfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_polygonfromtext":
{ Args: { "": string }; Returns: unknown
                           },
"st_project":
{ Args: { "azimuth": number,"distance": number,"geog": unknown }; Returns: unknown
                           },
"st_quantizecoordinates":
{ Args: { "g": unknown,"prec_m"?: number,"prec_x": number,"prec_y"?: number,"prec_z"?: number }; Returns: unknown
                           },
"st_reduceprecision":
{ Args: { "geom": unknown,"gridsize": number }; Returns: unknown
                           },
"st_relate":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: string
                           },
"st_removerepeatedpoints":
{ Args: { "geom": unknown,"tolerance"?: number }; Returns: unknown
                           },
"st_segmentize":
{ Args: { "geog": unknown,"max_segment_length": number }; Returns: unknown
                           },
"st_setsrid":
{ Args: { "geog": unknown,"srid": number }; Returns: unknown
                           } |
{ Args: { "geom": unknown,"srid": number }; Returns: unknown
                           },
"st_sharedpaths":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_shortestline":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_simplifypolygonhull":
{ Args: { "geom": unknown,"is_outer"?: boolean,"vertex_fraction": number }; Returns: unknown
                           },
"st_split":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_square":
{ Args: { "cell_i": number,"cell_j": number,"origin"?: unknown,"size": number }; Returns: unknown
                           },
"st_squaregrid":
{ Args: { "bounds": unknown,"size": number }; Returns: Record<string, unknown>[]
                           },
"st_srid":
{ Args: { "geog": unknown }; Returns: number
                           } |
{ Args: { "geom": unknown }; Returns: number
                           },
"st_subdivide":
{ Args: { "geom": unknown,"gridsize"?: number,"maxvertices"?: number }; Returns: unknown[]
                           },
"st_swapordinates":
{ Args: { "geom": unknown,"ords": unknown }; Returns: unknown
                           },
"st_symdifference":
{ Args: { "geom1": unknown,"geom2": unknown,"gridsize"?: number }; Returns: unknown
                           },
"st_symmetricdifference":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           },
"st_tileenvelope":
{ Args: { "bounds"?: unknown,"margin"?: number,"x": number,"y": number,"zoom": number }; Returns: unknown
                           },
"st_touches":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_transform":
{ Args: { "from_proj": string,"geom": unknown,"to_proj": string }; Returns: unknown
                           } |
{ Args: { "from_proj": string,"geom": unknown,"to_srid": number }; Returns: unknown
                           } |
{ Args: { "geom": unknown,"to_proj": string }; Returns: unknown
                           },
"st_triangulatepolygon":
{ Args: { "g1": unknown }; Returns: unknown
                           },
"st_union":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: unknown
                           } |
{ Args: { "geom1": unknown,"geom2": unknown,"gridsize": number }; Returns: unknown
                           },
"st_voronoilines":
{ Args: { "extend_to"?: unknown,"g1": unknown,"tolerance"?: number }; Returns: unknown
                           },
"st_voronoipolygons":
{ Args: { "extend_to"?: unknown,"g1": unknown,"tolerance"?: number }; Returns: unknown
                           },
"st_within":
{ Args: { "geom1": unknown,"geom2": unknown }; Returns: boolean
                           },
"st_wkbtosql":
{ Args: { "wkb": string }; Returns: unknown
                           },
"st_wkttosql":
{ Args: { "": string }; Returns: unknown
                           },
"st_wrapx":
{ Args: { "geom": unknown,"move": number,"wrap": number }; Returns: unknown
                           },
"unlockrows":
{ Args: { "": string }; Returns: number
                           },
"updategeometrysrid":
{ Args: { "catalogn_name": string,"column_name": string,"new_srid_in": number,"schema_name": string,"table_name": string }; Returns: string
                           }
          }
          Enums: {
            "deal_status": "proposed"|"confirmed"|"completed"|"cancelled","media_kind": "photo"|"video"|"brochure"|"catalogue","offering_status": "active"|"paused"|"archived","post_status": "active"|"paused"|"completed"|"expired"|"archived","response_type": "interested"|"lets_talk"|"call_me"|"send_proposal"|"apply"|"collaborate"|"offer_service"|"invest"|"partner"|"chat","verification_doc_type": "gst"|"udyam"|"fssai"|"trade_license"|"iec"|"other","verification_status": "none"|"pending"|"verified"|"rejected"
          }
          CompositeTypes: {
            "geometry_dump": {
                        "path": (number)[] | null,"geom": unknown
                      },"valid_detail": {
                        "valid": boolean | null,"reason": string | null,"location": unknown
                      }
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "deal_status": ["proposed", "confirmed", "completed", "cancelled"],"media_kind": ["photo", "video", "brochure", "catalogue"],"offering_status": ["active", "paused", "archived"],"post_status": ["active", "paused", "completed", "expired", "archived"],"response_type": ["interested", "lets_talk", "call_me", "send_proposal", "apply", "collaborate", "offer_service", "invest", "partner", "chat"],"verification_doc_type": ["gst", "udyam", "fssai", "trade_license", "iec", "other"],"verification_status": ["none", "pending", "verified", "rejected"]
          }
        }
} as const
