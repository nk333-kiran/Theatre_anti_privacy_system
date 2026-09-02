package com.theatre.antipiracy.data.remote

import com.google.gson.Gson
import com.theatre.antipiracy.data.local.SecureStorageManager
import com.theatre.antipiracy.data.models.ApiResponse
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object ApiClient {

    private lateinit var secureStorage: SecureStorageManager
    private val gson = Gson()

    private var currentBaseUrl: String = ""
    private var retrofitInstance: Retrofit? = null
    private var apiServiceInstance: MobileApiService? = null

    fun initialize(storage: SecureStorageManager) {
        this.secureStorage = storage
    }

    @Synchronized
    fun getApiService(): MobileApiService {
        val configuredUrl = secureStorage.getApiBaseUrl()
        val formattedUrl = if (configuredUrl.endsWith("/")) configuredUrl else "$configuredUrl/"

        if (apiServiceInstance == null || currentBaseUrl != formattedUrl) {
            currentBaseUrl = formattedUrl

            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }

            val authInterceptor = Interceptor { chain ->
                val original = chain.request()
                val requestBuilder = original.newBuilder()

                // Inject JWT Bearer token if present
                secureStorage.getAuthToken()?.let { token ->
                    requestBuilder.header("Authorization", "Bearer $token")
                }

                requestBuilder.header("Accept", "application/json")
                requestBuilder.header("User-Agent", "TheatreAntiPiracy-NativeAndroid/1.0")

                chain.proceed(requestBuilder.build())
            }

            val okHttpClient = OkHttpClient.Builder()
                .addInterceptor(authInterceptor)
                .addInterceptor(loggingInterceptor)
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .writeTimeout(20, TimeUnit.SECONDS)
                .build()

            retrofitInstance = Retrofit.Builder()
                .baseUrl(formattedUrl)
                .client(okHttpClient)
                .addConverterFactory(GsonConverterFactory.create(gson))
                .build()

            apiServiceInstance = retrofitInstance!!.create(MobileApiService::class.java)
        }

        return apiServiceInstance!!
    }

    fun parseErrorBody(response: retrofit2.Response<*>): ApiResponse<*>? {
        return try {
            val errorJson = response.errorBody()?.string()
            if (errorJson != null) {
                gson.fromJson(errorJson, ApiResponse::class.java)
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }
}
