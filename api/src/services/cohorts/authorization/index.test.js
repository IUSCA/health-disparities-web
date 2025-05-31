const {
  canPerformAction,
  canChangeVisibility,
  getPossibleActions,
  // getTransitionEffect,
} = require('./index');
const { CV } = require('./constants');

describe('authorization/index', () => {
  const baseCohort = {
    id: 1,
    visibility: CV.PRIVATE,
    is_referenced: false,
    in_review: false,
    is_archived: false,
    author_username: 'author1',
    is_locked: false,
    is_derivable: true,
  };

  const user = { username: 'user1', roles: [] };
  const author = { username: 'author1', roles: [] };
  const admin = { username: 'admin1', roles: ['admin'] };
  const operator = { username: 'operator1', roles: ['operator'] };

  describe('canPerformAction', () => {
    it('should allow author to view private cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      expect(canPerformAction('view', cohort, author)).toBe(true);
    });

    it('should not allow non-author user to view private cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      expect(canPerformAction('view', cohort, user)).toBe(false);
    });

    it('should allow admin to view public cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PUBLIC };
      expect(canPerformAction('view', cohort, admin)).toBe(true);
    });

    it('should allow user to clone unlisted cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(canPerformAction('clone', cohort, user)).toBe(true);
    });

    it('should not allow author to update archived cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE, is_archived: true };
      expect(canPerformAction('update', cohort, author)).toBe(false);
    });

    it('should allow admin to delete unlisted cohort if not in review or referenced', () => {
      const cohort = {
        ...baseCohort, visibility: CV.UNLISTED, in_review: false, is_referenced: false,
      };
      expect(canPerformAction('delete', cohort, admin)).toBe(true);
    });

    it('should not allow admin to delete unlisted cohort if referenced', () => {
      const cohort = {
        ...baseCohort, visibility: CV.UNLISTED, in_review: false, is_referenced: true,
      };
      expect(canPerformAction('delete', cohort, admin)).toBe(false);
    });

    it('should allow operator to view unlisted cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(canPerformAction('view', cohort, operator)).toBe(true);
    });

    it('should not allow operator to update public cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PUBLIC };
      expect(canPerformAction('update', cohort, operator)).toBe(false);
    });

    it('should allow operator to clone public cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PUBLIC };
      expect(canPerformAction('clone', cohort, operator)).toBe(true);
    });

    it('should not allow operator to delete private cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      expect(canPerformAction('delete', cohort, operator)).toBe(false);
    });

    it('should allow operator to derive from unlisted cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(canPerformAction('derive', cohort, operator)).toBe(true);
    });

    it('should not allow operator to archive cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(canPerformAction('archive', cohort, operator)).toBe(false);
    });

    it('should not allow operator to unarchive cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED, is_archived: true };
      expect(canPerformAction('unarchive', cohort, operator)).toBe(false);
    });
  });

  describe('canChangeVisibility', () => {
    it('should allow author to change from PRIVATE to UNLISTED', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      expect(
        canChangeVisibility({
          from: CV.PRIVATE, to: CV.UNLISTED, cohort, user: author,
        }),
      ).toBe(true);
    });

    it('should not allow user to change from PRIVATE to UNLISTED', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      expect(
        canChangeVisibility({
          from: CV.PRIVATE, to: CV.UNLISTED, cohort, user,
        }),
      ).toBe(false);
    });

    it('should allow admin to change from UNLISTED to PUBLIC', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(
        canChangeVisibility({
          from: CV.UNLISTED, to: CV.PUBLIC, cohort, user: admin,
        }),
      ).toBe(true);
    });

    it('should not allow author to change from UNLISTED to PUBLIC', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED };
      expect(
        canChangeVisibility({
          from: CV.UNLISTED, to: CV.PUBLIC, cohort, user: author,
        }),
      ).toBe(false);
    });

    it('should not allow author to change from UNLISTED to PRIVATE if referenced', () => {
      const cohort = { ...baseCohort, visibility: CV.UNLISTED, is_referenced: true };
      expect(
        canChangeVisibility({
          from: CV.UNLISTED, to: CV.PRIVATE, cohort, user: author,
        }),
      ).toBe(false);
    });
  });

  describe('getPossibleActions', () => {
    it('should return correct actions for author on private cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PRIVATE };
      const actions = getPossibleActions(cohort, author);
      expect(actions.includes('view')).toBe(true);
      expect(actions.includes('update')).toBe(true);
      expect(actions.includes('delete')).toBe(true);
      expect(actions.includes('clone')).toBe(true);
      expect(actions.includes('derive')).toBe(true);
      expect(actions.includes('archive')).toBe(true);
      expect(actions.includes('unarchive')).toBe(false);
      expect(actions.includes('publish')).toBe(false);
    });

    it('should return correct actions for admin on public cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PUBLIC };
      const actions = getPossibleActions(cohort, admin);
      expect(actions.includes('view')).toBe(true);
      expect(actions.includes('delete')).toBe(true);
      expect(actions.includes('clone')).toBe(true);
      expect(actions.includes('derive')).toBe(true);
      expect(actions.includes('archive')).toBe(true);
      expect(actions.includes('unarchive')).toBe(false);
      expect(actions.includes('publish')).toBe(false);
      expect(actions.includes('unpublish')).toBe(true);
    });

    it('should return correct actions for user on public cohort', () => {
      const cohort = { ...baseCohort, visibility: CV.PUBLIC };
      const actions = getPossibleActions(cohort, user);
      expect(actions.includes('view')).toBe(true);
      expect(actions.includes('clone')).toBe(true);
      expect(actions.includes('derive')).toBe(true);
      expect(actions.includes('request')).toBe(true);
      expect(actions.includes('update')).toBe(false);
      expect(actions.includes('delete')).toBe(false);
    });
  });

  // describe('getTransitionEffect', () => {
  //   it('should lock cohort on PRIVATE->UNLISTED', () => {
  //     const cohort = { ...baseCohort, is_locked: false };
  //     const effect = getTransitionEffect({ from: CV.PRIVATE, to: CV.UNLISTED });
  //     const updated = effect(cohort);
  //     expect(updated.is_locked).toBe(true);
  //   });

  //   it('should unlock cohort on UNLISTED->PRIVATE', () => {
  //     const cohort = { ...baseCohort, is_locked: true };
  //     const effect = getTransitionEffect({ from: CV.UNLISTED, to: CV.PRIVATE });
  //     const updated = effect(cohort);
  //     expect(updated.is_locked).toBe(false);
  //   });

  //   it('should lock cohort and set is_derivable false on ARCHIVE', () => {
  //     const cohort = { ...baseCohort, is_locked: false, is_derivable: true };
  //     const effect = getTransitionEffect({ event: 'ARCHIVE' });
  //     const updated = effect(cohort);
  //     expect(updated.is_locked).toBe(true);
  //     expect(updated.is_derivable).toBe(false);
  //   });

  //   it('should set is_locked false if PRIVATE on UNARCHIVE', () => {
  //     const cohort = {
  //       ...baseCohort, visibility: CV.PRIVATE, is_locked: true, is_derivable: true,
  //     };
  //     const effect = getTransitionEffect({ event: 'UNARCHIVE' });
  //     const updated = effect(cohort);
  //     expect(updated.is_locked).toBe(false);
  //     expect(updated.is_derivable).toBe(false);
  //   });

  //   it('should keep is_locked unchanged if not PRIVATE on UNARCHIVE', () => {
  //     const cohort = {
  //       ...baseCohort, visibility: CV.UNLISTED, is_locked: true, is_derivable: true,
  //     };
  //     const effect = getTransitionEffect({ event: 'UNARCHIVE' });
  //     const updated = effect(cohort);
  //     expect(updated.is_locked).toBe(true);
  //     expect(updated.is_derivable).toBe(false);
  //   });
  // });
});
