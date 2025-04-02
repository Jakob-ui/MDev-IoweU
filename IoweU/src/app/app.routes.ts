import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () =>
      import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: 'group-overview',
    loadComponent: () =>
      import('./pages/group-overview/group-overview.page').then(
        (m) => m.GroupOverviewPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'create-group',
    loadComponent: () =>
      import('./pages/create-group/create-group.page').then(
        (m) => m.CreateGroupPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'group',
    loadComponent: () =>
      import('./pages/group/group.page').then((m) => m.GroupPage),
    canActivate: [AuthGuard],
  },
  {
    path: 'finance',
    loadComponent: () =>
      import('./pages/finance/finance.page').then((m) => m.FinancePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./pages/reset-password/reset-password.page').then(
        (m) => m.ResetPasswordPage
      ),
  },
  {
    path: 'account-settings',
    loadComponent: () =>
      import('./pages/account-settings/account-settings.page').then(
        (m) => m.AccountSettingsPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'expance',
    loadComponent: () =>
      import('./pages/expance/expance.page').then((m) => m.ExpancePage),
    canActivate: [AuthGuard],
  },
  {
    path: 'create-expance',
    loadComponent: () =>
      import('./pages/create-expance/create-expance.page').then(
        (m) => m.CreateExpancePage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: 'edit-group',
    loadComponent: () =>
      import('./pages/edit-group/edit-group.page').then(
        m => m.EditGroupPage
      ),
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    redirectTo: 'home',
    pathMatch: 'full',
  },
];
