import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ethers } from 'ethers';
import { User } from '../entities/user.entity';

@Injectable()
export class WalletStrategy extends PassportStrategy(Strategy, 'wallet') {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {
    super();
  }

  async validate(req: any): Promise<any> {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      throw new UnauthorizedException('Wallet address, signature, and message are required');
    }

    try {
      // Verify the signature
      const recoveredAddress = ethers.utils.verifyMessage(message, signature);
      
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Find user by wallet address
      const user = await this.userRepository.findOne({
        where: { walletAddress: walletAddress.toLowerCase() },
        relations: ['roles'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account is not active');
      }

      return {
        sub: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        roles: user.roleNames,
        user,
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid wallet signature');
    }
  }
}

