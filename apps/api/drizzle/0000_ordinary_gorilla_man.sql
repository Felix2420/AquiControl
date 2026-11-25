CREATE TYPE "public"."hora_toma" AS ENUM('mañana', 'tarde');--> statement-breakpoint
CREATE TYPE "public"."rol_granja" AS ENUM('admin', 'biologo', 'tecnico');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alimentacion_diaria" (
	"id" serial PRIMARY KEY NOT NULL,
	"estanque_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"dosis_calculada_kg" double precision NOT NULL,
	"dosis_aplicada_kg" double precision,
	"fca_proyectado" double precision,
	"explicacion_ia" text,
	"client_id" uuid,
	CONSTRAINT "alimentacion_diaria_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE "estanques" (
	"id" serial PRIMARY KEY NOT NULL,
	"granja_id" integer NOT NULL,
	"identificador_estanque" text NOT NULL,
	"hectareas" double precision NOT NULL,
	"densidad_siembra" double precision NOT NULL,
	"fecha_siembra" date NOT NULL,
	CONSTRAINT "estanques_granja_identificador_uq" UNIQUE("granja_id","identificador_estanque"),
	CONSTRAINT "estanques_hectareas_pos" CHECK ("estanques"."hectareas" > 0),
	CONSTRAINT "estanques_densidad_pos" CHECK ("estanques"."densidad_siembra" > 0)
);
--> statement-breakpoint
CREATE TABLE "granja_miembros" (
	"user_id" text NOT NULL,
	"granja_id" integer NOT NULL,
	"rol" "rol_granja" NOT NULL,
	CONSTRAINT "granja_miembros_uq" UNIQUE("user_id","granja_id")
);
--> statement-breakpoint
CREATE TABLE "granjas" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"ubicacion" text,
	"hectareas_totales" double precision NOT NULL,
	"fecha_registro" date DEFAULT CURRENT_DATE NOT NULL,
	CONSTRAINT "granjas_hectareas_totales_pos" CHECK ("granjas"."hectareas_totales" > 0)
);
--> statement-breakpoint
CREATE TABLE "lecturas_charolas" (
	"id" serial PRIMARY KEY NOT NULL,
	"estanque_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"hora_toma" "hora_toma" NOT NULL,
	"porcentaje_sobrante" double precision NOT NULL,
	"ajuste_realizado_kg" double precision,
	CONSTRAINT "charolas_sobrante_rango" CHECK ("lecturas_charolas"."porcentaje_sobrante" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "muestreos_biometria" (
	"id" serial PRIMARY KEY NOT NULL,
	"estanque_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"peso_promedio_g" double precision NOT NULL,
	"ganancia_semanal_g" double precision,
	"biomasa_estimada_kg" double precision,
	CONSTRAINT "biometria_peso_pos" CHECK ("muestreos_biometria"."peso_promedio_g" > 0)
);
--> statement-breakpoint
CREATE TABLE "parametros_agua" (
	"id" serial PRIMARY KEY NOT NULL,
	"estanque_id" integer NOT NULL,
	"fecha" date NOT NULL,
	"temperatura_c" double precision,
	"oxigeno_mg_l" double precision,
	"salinidad_ppm" double precision,
	"ph" double precision,
	"amonio_ppm" double precision,
	CONSTRAINT "agua_oxigeno_nonneg" CHECK ("parametros_agua"."oxigeno_mg_l" IS NULL OR "parametros_agua"."oxigeno_mg_l" >= 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alimentacion_diaria" ADD CONSTRAINT "alimentacion_diaria_estanque_id_estanques_id_fk" FOREIGN KEY ("estanque_id") REFERENCES "public"."estanques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "estanques" ADD CONSTRAINT "estanques_granja_id_granjas_id_fk" FOREIGN KEY ("granja_id") REFERENCES "public"."granjas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "granja_miembros" ADD CONSTRAINT "granja_miembros_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "granja_miembros" ADD CONSTRAINT "granja_miembros_granja_id_granjas_id_fk" FOREIGN KEY ("granja_id") REFERENCES "public"."granjas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lecturas_charolas" ADD CONSTRAINT "lecturas_charolas_estanque_id_estanques_id_fk" FOREIGN KEY ("estanque_id") REFERENCES "public"."estanques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "muestreos_biometria" ADD CONSTRAINT "muestreos_biometria_estanque_id_estanques_id_fk" FOREIGN KEY ("estanque_id") REFERENCES "public"."estanques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parametros_agua" ADD CONSTRAINT "parametros_agua_estanque_id_estanques_id_fk" FOREIGN KEY ("estanque_id") REFERENCES "public"."estanques"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_alimentacion_estanque" ON "alimentacion_diaria" USING btree ("estanque_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_estanques_granja" ON "estanques" USING btree ("granja_id");--> statement-breakpoint
CREATE INDEX "idx_miembros_user" ON "granja_miembros" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_charolas_estanque" ON "lecturas_charolas" USING btree ("estanque_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_biometria_estanque" ON "muestreos_biometria" USING btree ("estanque_id","fecha");--> statement-breakpoint
CREATE INDEX "idx_agua_estanque" ON "parametros_agua" USING btree ("estanque_id","fecha");