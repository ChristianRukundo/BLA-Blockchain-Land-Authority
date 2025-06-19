import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export interface JwtPayload {
  sub: string;
  email?: string;
  walletAddress?: string;
  roles: string[];
  iat?: number;
  exp?: number;
  temp?: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<any> {
    // For temporary tokens (2FA), only validate the payload
    if (payload.temp) {
      return {
        sub: payload.sub,
        temp: true,
      };
    }

    // For regular tokens, validate the user exists and is active
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['roles'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is not active');
    }

    // Update last active timestamp
    user.updateLastActive();
    await this.userRepository.save(user);

    return {
      sub: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      roles: user.roleNames,
      permissions: this.getUserPermissions(user),
      user,
    };
  }

  private getUserPermissions(user: User): string[] {
    const permissions = new Set<string>();
    
    user.roles?.forEach(role => {
      role.permissions?.forEach(permission => {
        permissions.add(permission);
      });
    });

    return Array.from(permissions);
  }
}

