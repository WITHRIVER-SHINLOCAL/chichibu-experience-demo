CREATE TYPE "public"."ease_rating" AS ENUM('easy', 'normal', 'hard');--> statement-breakpoint
CREATE TYPE "public"."fact_status" AS ENUM('FACT', 'INFERENCE', 'IDEA');--> statement-breakpoint
CREATE TYPE "public"."ideation_counterfactual" AS ENUM('would_have', 'partially', 'would_not_have');--> statement-breakpoint
CREATE TYPE "public"."org_role" AS ENUM('owner', 'staff', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."permission_status" AS ENUM('unconfirmed', 'requested', 'granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."program_status" AS ENUM('IDEA', 'RESEARCH', 'FIELD_CHECK', 'PROTOTYPE', 'VALIDATED', 'READY', 'ACTIVE', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."relationship_category" AS ENUM('geological', 'ecological', 'hydrological', 'cultural', 'spiritual', 'historical', 'economic', 'other');--> statement-breakpoint
CREATE TYPE "public"."reliability_grade" AS ENUM('A', 'B', 'C', 'D');--> statement-breakpoint
CREATE TYPE "public"."resource_category" AS ENUM('NATURE', 'CREATURES', 'GEOLOGY', 'CULTURE', 'HISTORY', 'INDUSTRY', 'FOOD', 'PEOPLE', 'PLACE', 'STORY');--> statement-breakpoint
CREATE TYPE "public"."source_type" AS ENUM('government', 'museum', 'academic', 'dmo', 'tourism_association', 'official_shrine_temple', 'local_business', 'industry_association', 'expert', 'blog', 'sns', 'platform', 'other');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'staff');--> statement-breakpoint
CREATE TABLE "activity_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"primary_resource_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"required_group_size_min" integer,
	"required_group_size_max" integer,
	"appropriate_age_min" integer,
	"appropriate_age_max" integer,
	"duration_minutes_min" integer,
	"duration_minutes_max" integer,
	"required_equipment" text[] DEFAULT '{}'::text[] NOT NULL,
	"permission_required" boolean,
	"permission_required_from" text,
	"permission_status" "permission_status",
	"safety_risks" text,
	"seasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"rain_policy" text,
	"needs_guide" boolean,
	"collaborators_note" text,
	"access_notes" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"derived_from_relationship_id" uuid,
	"fact_status" "fact_status" DEFAULT 'IDEA' NOT NULL,
	"confidence" integer,
	"source_id" uuid,
	"field_checked_at" timestamp with time zone,
	"field_checked_by_id" uuid,
	"created_by" text NOT NULL,
	"human_approved" boolean DEFAULT false NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_opportunity_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"activity_opportunity_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"note" text,
	CONSTRAINT "activity_opportunity_resources_activity_opportunity_id_resource_id_unique" UNIQUE("activity_opportunity_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"title" text,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "itineraries_program_id_unique" UNIQUE("program_id")
);
--> statement-breakpoint
CREATE TABLE "itinerary_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text,
	"activity" text NOT NULL,
	"resource_id" uuid,
	"staff_note" text
);
--> statement-breakpoint
CREATE TABLE "market_program_analysis" (
	"id" uuid PRIMARY KEY NOT NULL,
	"market_program_id" uuid NOT NULL,
	"parent_appeal" text,
	"child_appeal" text,
	"specialness" text,
	"educational_value" text,
	"child_reaction_from_reviews" text,
	"safety_evaluation_from_reviews" text,
	"guide_evaluation_from_reviews" text,
	"learning_value_from_reviews" text,
	"analyzed_by_id" uuid,
	"analyzed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_program_analysis_market_program_id_unique" UNIQUE("market_program_id")
);
--> statement-breakpoint
CREATE TABLE "market_program_prices" (
	"id" uuid PRIMARY KEY NOT NULL,
	"market_program_id" uuid NOT NULL,
	"price_type" text NOT NULL,
	"amount" integer NOT NULL,
	"unit" text,
	"tax_included" boolean,
	"material_included" boolean,
	"target" text,
	"notes" text,
	"condition_age_min" integer,
	"condition_age_max" integer,
	"residency_condition" text,
	"course_name" text,
	"is_ancillary" boolean DEFAULT false NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_name" text,
	"url" text,
	"platform_id" uuid,
	"category_raw" text,
	"area_text" text,
	"matched_region_id" uuid,
	"target_age_min" integer,
	"target_age_max" integer,
	"duration_minutes" integer,
	"capacity_min" integer,
	"capacity_max" integer,
	"parent_accompaniment" text,
	"title" text,
	"catch_copy" text,
	"description" text,
	"flow" text,
	"main_activities" text[] DEFAULT '{}'::text[] NOT NULL,
	"learning_elements" text[] DEFAULT '{}'::text[] NOT NULL,
	"takeaway_elements" text[] DEFAULT '{}'::text[] NOT NULL,
	"marketing_messages" text[] DEFAULT '{}'::text[] NOT NULL,
	"instructor_notes" text[] DEFAULT '{}'::text[] NOT NULL,
	"review_rating" real,
	"review_count" integer,
	"review_checked_at" timestamp with time zone,
	"event_dates" text[] DEFAULT '{}'::text[] NOT NULL,
	"booking_status" text,
	"full_booked_flag" boolean,
	"safety_management" text,
	"rain_policy" text,
	"cancellation_policy" text,
	"estimated_fields" text[] DEFAULT '{}'::text[] NOT NULL,
	"researched_empty_items" text[] DEFAULT '{}'::text[] NOT NULL,
	"source_id" uuid,
	"last_checked_at" timestamp with time zone,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"org_type" text,
	"home_region_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid,
	"activity_opportunity_id" uuid,
	"url" text NOT NULL,
	"caption" text,
	"source_id" uuid,
	"rights_note" text,
	"uploaded_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text,
	"notes" text,
	CONSTRAINT "platforms_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "program_activity_opportunities" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"activity_opportunity_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"note" text,
	CONSTRAINT "program_activity_opportunities_program_id_activity_opportunity_id_unique" UNIQUE("program_id","activity_opportunity_id")
);
--> statement-breakpoint
CREATE TABLE "program_ai_reviews" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"diagnosis" jsonb,
	"missing_research" jsonb,
	"market_comparison" jsonb,
	"improvement_ideas" jsonb,
	"approved_idea_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_id" uuid,
	"product_draft" jsonb,
	"adopted_sections" text[] DEFAULT '{}'::text[] NOT NULL,
	"adopted_at" timestamp with time zone,
	"adopted_by_id" uuid,
	"model" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_feedback" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"ease_rating" "ease_rating" NOT NULL,
	"ideation_counterfactual" "ideation_counterfactual" NOT NULL,
	"confusion_points" text,
	"missing_info" text,
	"unnecessary_info" text,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "program_resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"note" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "program_resources_program_id_resource_id_unique" UNIQUE("program_id","resource_id")
);
--> statement-breakpoint
CREATE TABLE "program_wizard_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"program_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"saved_at" timestamp with time zone NOT NULL,
	"total_seconds" integer NOT NULL,
	"step_durations_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region_id" uuid NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"concept" text,
	"target_audience" text,
	"target_age_min" integer,
	"target_age_max" integer,
	"market_needs" text,
	"why_chichibu" text,
	"experience_content" text,
	"inquiry_theme" text,
	"participant_questions" text,
	"seasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"duration_minutes" integer,
	"capacity_min" integer,
	"capacity_max" integer,
	"recommended_price" integer,
	"status" "program_status" DEFAULT 'IDEA' NOT NULL,
	"fact_status" "fact_status" DEFAULT 'IDEA' NOT NULL,
	"human_approved" boolean DEFAULT false NOT NULL,
	"generated_by" text,
	"owner_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"parent_region_id" uuid,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "resource_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL,
	"organization_id" uuid,
	"fact_status" "fact_status" NOT NULL,
	"body" text NOT NULL,
	"source_id" uuid,
	"confidence" integer,
	"created_by" text NOT NULL,
	"human_approved" boolean DEFAULT false NOT NULL,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_relationships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"from_resource_id" uuid NOT NULL,
	"to_resource_id" uuid NOT NULL,
	"relationship_category" "relationship_category" NOT NULL,
	"relationship_label" text NOT NULL,
	"description" text,
	"fact_status" "fact_status" DEFAULT 'INFERENCE' NOT NULL,
	"source_id" uuid,
	"confidence" integer,
	"created_by" text NOT NULL,
	"human_approved" boolean DEFAULT false NOT NULL,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"resource_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"note" text,
	CONSTRAINT "resource_sources_resource_id_source_id_unique" UNIQUE("resource_id","source_id")
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"region_id" uuid NOT NULL,
	"category" "resource_category" NOT NULL,
	"name" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"background" text,
	"history" text,
	"seasons" text[] DEFAULT '{}'::text[] NOT NULL,
	"target_age" text,
	"education_theme" text,
	"experience_potential_note" text,
	"owner_manager" text,
	"collaborators" text,
	"url" text,
	"lat" real,
	"lng" real,
	"safety_notes" text,
	"rain_policy" text,
	"price_info" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"memo" text,
	"fact_status" "fact_status" DEFAULT 'INFERENCE' NOT NULL,
	"confidence" integer,
	"verified_by_id" uuid,
	"verified_at" timestamp with time zone,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"organization" text,
	"source_type" "source_type" NOT NULL,
	"reliability_grade" "reliability_grade" NOT NULL,
	"published_at" timestamp with time zone,
	"accessed_at" timestamp with time zone NOT NULL,
	"notes" text,
	"is_sample" boolean DEFAULT false NOT NULL,
	"created_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role_in_org" "org_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_organizations_user_id_organization_id_unique" UNIQUE("user_id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_primary_resource_id_resources_id_fk" FOREIGN KEY ("primary_resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_derived_from_relationship_id_resource_relationships_id_fk" FOREIGN KEY ("derived_from_relationship_id") REFERENCES "public"."resource_relationships"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunities" ADD CONSTRAINT "activity_opportunities_field_checked_by_id_users_id_fk" FOREIGN KEY ("field_checked_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunity_resources" ADD CONSTRAINT "activity_opportunity_resources_activity_opportunity_id_activity_opportunities_id_fk" FOREIGN KEY ("activity_opportunity_id") REFERENCES "public"."activity_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_opportunity_resources" ADD CONSTRAINT "activity_opportunity_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_items" ADD CONSTRAINT "itinerary_items_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_program_analysis" ADD CONSTRAINT "market_program_analysis_market_program_id_market_programs_id_fk" FOREIGN KEY ("market_program_id") REFERENCES "public"."market_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_program_analysis" ADD CONSTRAINT "market_program_analysis_analyzed_by_id_users_id_fk" FOREIGN KEY ("analyzed_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_program_prices" ADD CONSTRAINT "market_program_prices_market_program_id_market_programs_id_fk" FOREIGN KEY ("market_program_id") REFERENCES "public"."market_programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_program_prices" ADD CONSTRAINT "market_program_prices_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_programs" ADD CONSTRAINT "market_programs_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_programs" ADD CONSTRAINT "market_programs_matched_region_id_regions_id_fk" FOREIGN KEY ("matched_region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_programs" ADD CONSTRAINT "market_programs_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_programs" ADD CONSTRAINT "market_programs_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_home_region_id_regions_id_fk" FOREIGN KEY ("home_region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_activity_opportunity_id_activity_opportunities_id_fk" FOREIGN KEY ("activity_opportunity_id") REFERENCES "public"."activity_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "photos" ADD CONSTRAINT "photos_uploaded_by_id_users_id_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_activity_opportunities" ADD CONSTRAINT "program_activity_opportunities_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_activity_opportunities" ADD CONSTRAINT "program_activity_opportunities_activity_opportunity_id_activity_opportunities_id_fk" FOREIGN KEY ("activity_opportunity_id") REFERENCES "public"."activity_opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_ai_reviews" ADD CONSTRAINT "program_ai_reviews_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_ai_reviews" ADD CONSTRAINT "program_ai_reviews_approved_by_id_users_id_fk" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_ai_reviews" ADD CONSTRAINT "program_ai_reviews_adopted_by_id_users_id_fk" FOREIGN KEY ("adopted_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_ai_reviews" ADD CONSTRAINT "program_ai_reviews_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_feedback" ADD CONSTRAINT "program_feedback_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_feedback" ADD CONSTRAINT "program_feedback_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_resources" ADD CONSTRAINT "program_resources_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_resources" ADD CONSTRAINT "program_resources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_wizard_logs" ADD CONSTRAINT "program_wizard_logs_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_notes" ADD CONSTRAINT "resource_notes_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relationships" ADD CONSTRAINT "resource_relationships_from_resource_id_resources_id_fk" FOREIGN KEY ("from_resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relationships" ADD CONSTRAINT "resource_relationships_to_resource_id_resources_id_fk" FOREIGN KEY ("to_resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_relationships" ADD CONSTRAINT "resource_relationships_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_sources" ADD CONSTRAINT "resource_sources_resource_id_resources_id_fk" FOREIGN KEY ("resource_id") REFERENCES "public"."resources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resource_sources" ADD CONSTRAINT "resource_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_verified_by_id_users_id_fk" FOREIGN KEY ("verified_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "resources" ADD CONSTRAINT "resources_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_organizations" ADD CONSTRAINT "user_organizations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;