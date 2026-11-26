ALTER TABLE "estanques" ADD COLUMN "latitud" double precision;--> statement-breakpoint
ALTER TABLE "estanques" ADD COLUMN "longitud" double precision;--> statement-breakpoint
ALTER TABLE "granjas" ADD COLUMN "latitud" double precision;--> statement-breakpoint
ALTER TABLE "granjas" ADD COLUMN "longitud" double precision;--> statement-breakpoint
ALTER TABLE "estanques" ADD CONSTRAINT "estanques_coordenadas_rango" CHECK (("estanques"."latitud" IS NULL OR "estanques"."latitud" BETWEEN -90 AND 90) AND ("estanques"."longitud" IS NULL OR "estanques"."longitud" BETWEEN -180 AND 180));--> statement-breakpoint
ALTER TABLE "granjas" ADD CONSTRAINT "granjas_coordenadas_rango" CHECK (("granjas"."latitud" IS NULL OR "granjas"."latitud" BETWEEN -90 AND 90) AND ("granjas"."longitud" IS NULL OR "granjas"."longitud" BETWEEN -180 AND 180));