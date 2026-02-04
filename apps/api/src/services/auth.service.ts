import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt, { SignOptions } from "jsonwebtoken";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

interface LoginInput {
  email: string;
  password: string;
  tenantSlug?: string;
}

interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    tenantSlug: string;
    tenantId: string;
  };
  tenant: {
    id: string;
    slug: string;
    legalName: string;
  };
}

export class AuthService {
  async login(input: LoginInput): Promise<AuthResult> {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Verify password
    const passwordValid = await bcrypt.compare(input.password, user.password);

    if (!passwordValid) {
      throw new Error("Invalid credentials");
    }

    // Check user status
    if (user.status !== "active") {
      throw new Error("User account is not active");
    }

    // Find tenant - if tenantSlug provided, use it; otherwise get user's first tenant
    let tenant;

    if (input.tenantSlug) {
      tenant = await prisma.tenant.findUnique({
        where: { slug: input.tenantSlug },
      });
    } else {
      // Get user's first tenant from tenantUser relationship
      const tenantUser = await prisma.tenantUser.findFirst({
        where: { userId: user.id },
        include: { tenant: true },
      });

      if (tenantUser) {
        tenant = tenantUser.tenant;
      }
    }

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Check tenant access
    const tenantUser = await prisma.tenantUser.findUnique({
      where: {
        tenantId_userId: {
          tenantId: tenant.id,
          userId: user.id,
        },
      },
    });

    if (!tenantUser) {
      throw new Error("User does not have access to this tenant");
    }

    // Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
      role: tenantUser.role,
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      email: user.email,
      tenantId: tenant.id,
    });

    logger.info({ userId: user.id, tenantId: tenant.id }, "User logged in");

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: tenantUser.role,
        tenantSlug: tenant.slug,
        tenantId: tenant.id,
      },
      tenant: {
        id: tenant.id,
        slug: tenant.slug,
        legalName: tenant.legalName,
      },
    };
  }

  private generateAccessToken(payload: {
    userId: string;
    email: string;
    tenantId: string;
    role: string;
  }): string {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "15m",
    });
  }

  private generateRefreshToken(payload: {
    userId: string;
    email: string;
    tenantId: string;
  }): string {
    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET!, {
      expiresIn: "7d",
    });
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: string }> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET!,
      ) as {
        userId: string;
        email: string;
        tenantId: string;
      };

      // Get user and tenant to ensure they still exist and are active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
      });

      if (!user || user.status !== "active") {
        throw new Error("User not found or inactive");
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: decoded.tenantId },
      });

      if (!tenant) {
        throw new Error("Tenant not found");
      }

      // Get tenant user role
      const tenantUser = await prisma.tenantUser.findUnique({
        where: {
          tenantId_userId: {
            tenantId: tenant.id,
            userId: user.id,
          },
        },
      });

      if (!tenantUser) {
        throw new Error("User access revoked");
      }

      // Generate new access token
      const accessToken = this.generateAccessToken({
        userId: user.id,
        email: user.email,
        tenantId: tenant.id,
        role: tenantUser.role,
      });

      logger.info(
        { userId: user.id, tenantId: tenant.id },
        "Access token refreshed",
      );

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error("Invalid refresh token");
      }
      throw error;
    }
  }
}
