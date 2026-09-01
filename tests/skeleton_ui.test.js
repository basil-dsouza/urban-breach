import { describe, it, expect } from 'vitest';

describe('Biometric Anatomical Skeleton & Bullet Wound HUD System', () => {
    it('should generate correct debuff list when bones are fractured', () => {
        const bodyBones = {
            head: false,
            torso: true,
            leftArm: false,
            rightArm: true,
            leftLeg: true,
            rightLeg: false
        };
        const bulletWounds = {
            head: 0,
            torso: 1,
            leftArm: 0,
            rightArm: 1,
            leftLeg: 1,
            rightLeg: 0
        };
        const isBleeding = true;

        const debuffs = [];
        let totalWounds = 0;
        for (const zone in bulletWounds) {
            totalWounds += (bulletWounds[zone] || 0);
        }

        const hasFractures = !!(bodyBones && (bodyBones.head || bodyBones.torso || bodyBones.leftArm || bodyBones.rightArm || bodyBones.leftLeg || bodyBones.rightLeg));

        if (bodyBones) {
            if (bodyBones.head) debuffs.push('⚡ CRANIAL FRACTURE (+40% SWAY)');
            if (bodyBones.torso) debuffs.push('⚡ RIBS CRACKED (-50% BREATH)');
            if (bodyBones.leftArm || bodyBones.rightArm) debuffs.push('⚡ ARM FRACTURED (+50% RELOAD)');
            if (bodyBones.leftLeg || bodyBones.rightLeg) debuffs.push('⚡ LEG FRACTURED (-35% SPD)');
        }
        if (isBleeding || totalWounds > 0) {
            debuffs.push(`🩸 BLEEDING (${totalWounds} WOUND${totalWounds > 1 ? 'S' : ''})`);
        }

        expect(hasFractures).toBe(true);
        expect(totalWounds).toBe(3);
        expect(debuffs).toContain('⚡ RIBS CRACKED (-50% BREATH)');
        expect(debuffs).toContain('⚡ ARM FRACTURED (+50% RELOAD)');
        expect(debuffs).toContain('⚡ LEG FRACTURED (-35% SPD)');
        expect(debuffs).toContain('🩸 BLEEDING (3 WOUNDS)');
    });

    it('should show OPTIMAL status with 0 debuffs when fully healed', () => {
        const bodyBones = {
            head: false,
            torso: false,
            leftArm: false,
            rightArm: false,
            leftLeg: false,
            rightLeg: false
        };
        const bulletWounds = {
            head: 0,
            torso: 0,
            leftArm: 0,
            rightArm: 0,
            leftLeg: 0,
            rightLeg: 0
        };
        const isBleeding = false;

        const debuffs = [];
        let totalWounds = 0;
        for (const zone in bulletWounds) {
            totalWounds += (bulletWounds[zone] || 0);
        }

        const hasFractures = !!(bodyBones && (bodyBones.head || bodyBones.torso || bodyBones.leftArm || bodyBones.rightArm || bodyBones.leftLeg || bodyBones.rightLeg));
        const status = (hasFractures || isBleeding) ? (isBleeding ? 'BLEEDING' : 'FRACTURED') : 'OPTIMAL';

        expect(hasFractures).toBe(false);
        expect(totalWounds).toBe(0);
        expect(debuffs.length).toBe(0);
        expect(status).toBe('OPTIMAL');
    });
});
