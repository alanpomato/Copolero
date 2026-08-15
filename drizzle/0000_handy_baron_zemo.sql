CREATE TABLE `decisiones` (
	`id` text PRIMARY KEY NOT NULL,
	`partida_id` text NOT NULL,
	`temporada` integer NOT NULL,
	`fase` integer NOT NULL,
	`rol` text NOT NULL,
	`payload_json` text NOT NULL,
	`enviada_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `decisiones_por_fase` ON `decisiones` (`partida_id`,`temporada`,`fase`);--> statement-breakpoint
CREATE UNIQUE INDEX `decisiones_una_por_rol_y_fase` ON `decisiones` (`partida_id`,`temporada`,`fase`,`rol`);--> statement-breakpoint
CREATE TABLE `jugadores` (
	`id` text PRIMARY KEY NOT NULL,
	`partida_id` text NOT NULL,
	`rol` text NOT NULL,
	`token` text NOT NULL,
	`nombre` text NOT NULL,
	`ultima_vez_en` integer DEFAULT (unixepoch()) NOT NULL,
	`creado_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `jugadores_token_unique` ON `jugadores` (`token`);--> statement-breakpoint
CREATE UNIQUE INDEX `jugadores_partida_rol` ON `jugadores` (`partida_id`,`rol`);--> statement-breakpoint
CREATE TABLE `log` (
	`id` text PRIMARY KEY NOT NULL,
	`partida_id` text NOT NULL,
	`temporada` integer NOT NULL,
	`fase` integer NOT NULL,
	`tipo` text NOT NULL,
	`visible_para` text NOT NULL,
	`texto` text NOT NULL,
	`datos_json` text,
	`creada_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `log_por_partida` ON `log` (`partida_id`,`temporada`,`fase`);--> statement-breakpoint
CREATE TABLE `partidas` (
	`id` text PRIMARY KEY NOT NULL,
	`codigo` text NOT NULL,
	`estado` text DEFAULT 'esperando' NOT NULL,
	`semilla` text NOT NULL,
	`temporada` integer DEFAULT 1 NOT NULL,
	`fase` integer DEFAULT 1 NOT NULL,
	`estado_json` text NOT NULL,
	`pausada` integer DEFAULT false NOT NULL,
	`creada_en` integer DEFAULT (unixepoch()) NOT NULL,
	`actualizada_en` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `partidas_codigo_unique` ON `partidas` (`codigo`);--> statement-breakpoint
CREATE TABLE `snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`partida_id` text NOT NULL,
	`temporada` integer NOT NULL,
	`fase` integer NOT NULL,
	`estado_json` text NOT NULL,
	`creada_en` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`partida_id`) REFERENCES `partidas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `snapshots_uno_por_fase` ON `snapshots` (`partida_id`,`temporada`,`fase`);