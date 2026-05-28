import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class ApiService {
  static final ApiService instance = ApiService._();
  ApiService._();

  static const _baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://10.0.2.2:3001/api',
  );

  final _storage = const FlutterSecureStorage();
  late final Dio dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  ))
    ..interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (e, handler) {
        if (e.response?.statusCode == 401) {
          _storage.delete(key: 'jwt_token');
        }
        handler.next(e);
      },
    ));

  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await dio.post('/auth/login', data: {'email': email, 'password': password});
    return res.data as Map<String, dynamic>;
  }

  Future<List<dynamic>> getAssets() async {
    final res = await dio.get('/assets');
    return res.data as List<dynamic>;
  }

  Future<Map<String, dynamic>> getAsset(String id) async {
    final res = await dio.get('/assets/$id');
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createAsset(Map<String, dynamic> data) async {
    final res = await dio.post('/assets', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> createTag(Map<String, dynamic> data) async {
    final res = await dio.post('/tags', data: data);
    return res.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>?> getAssetByTagId(String hardwareId) async {
    try {
      final res = await dio.get('/tags/hardware/$hardwareId');
      return res.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  Future<void> createLocation(String assetId, double lat, double lng) async {
    await dio.post('/locations', data: {
      'assetId': assetId,
      'latitude': lat,
      'longitude': lng,
      'siteName': 'Scan terrain',
    });
  }
}
