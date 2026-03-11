CREATE TABLE "user_auths" (
	"user_id" integer PRIMARY KEY NOT NULL,
	"hashed_password" varchar(255) NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"username" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "user_auths" ADD CONSTRAINT "user_auths_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;