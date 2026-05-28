import 'package:go_router/go_router.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../../presentation/screens/login_screen.dart';
import '../../presentation/screens/dashboard_screen.dart';
import '../../presentation/screens/scanner_screen.dart';
import '../../presentation/screens/enroll_wizard_screen.dart';
import '../../presentation/screens/assets_list_screen.dart';
import '../../presentation/screens/asset_detail_screen.dart';

class AppRouter {
  static final _storage = FlutterSecureStorage();

  static final router = GoRouter(
    initialLocation: '/login',
    redirect: (context, state) async {
      final token = await _storage.read(key: 'jwt_token');
      final onLogin = state.matchedLocation == '/login';
      if (token == null && !onLogin) return '/login';
      if (token != null && onLogin) return '/dashboard';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (c, s) => const LoginScreen()),
      GoRoute(path: '/dashboard', builder: (c, s) => const DashboardScreen()),
      GoRoute(path: '/scanner', builder: (c, s) => const ScannerScreen()),
      GoRoute(
        path: '/enroll',
        builder: (c, s) => EnrollWizardScreen(
          initialHardwareId: s.uri.queryParameters['hardwareId'],
          initialTagType: s.uri.queryParameters['tagType'] ?? 'QR',
        ),
      ),
      GoRoute(path: '/assets', builder: (c, s) => const AssetsListScreen()),
      GoRoute(
        path: '/assets/:id',
        builder: (c, s) => AssetDetailScreen(assetId: s.pathParameters['id']!),
      ),
    ],
  );
}
