"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clerkClient = void 0;
const backend_1 = require("@clerk/backend");
exports.clerkClient = (0, backend_1.createClerkClient)({
    secretKey: process.env.CLERK_SECRET_KEY,
});
