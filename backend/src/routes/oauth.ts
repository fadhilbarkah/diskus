import { Hono } from "hono";
import { OAuthController } from "../controllers/oauth.controller";

const oauthRoutes = new Hono();

oauthRoutes.get("/:provider", OAuthController.redirect);
oauthRoutes.get("/:provider/callback", OAuthController.callback);

export default oauthRoutes;
